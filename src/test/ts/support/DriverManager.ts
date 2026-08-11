/**
 * driverManager - owns the Appium session lifecycle, and nothing else.
 *
 * One WebdriverIO session per cucumber-js worker process. Base capabilities
 * come straight from the single config file (resources/config/android.caps.json)
 * - the one source of truth, no wrapper or duplication. For parallel runs each
 * worker derives a unique slot from CUCUMBER_WORKER_ID (see workerSlot). The
 * World, hooks and page objects consume the driver but never create it.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { remote, type Browser } from 'webdriverio';
import { HOME_TAB, HOME_NAV_BUTTON, AUT_PACKAGE } from '../locators/common.locators';
import { availableUdids } from './devices';
import { capsFileName, defaultBasePort, portCapabilityName, usesAdb } from './platform';

// Read the config once — android.caps.json or ios.caps.json, per the platform
// this run targets. `devices` is the list of device udids for parallel runs;
// everything else is the common capabilities shared by every device.
const RAW_CONFIG = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../resources/config', capsFileName()),
    'utf8',
  ),
) as Record<string, unknown>;
const { devices: _DEVICES_IGNORED, ...RAW_CAPS } = RAW_CONFIG;

/**
 * Everything in the config EXCEPT bookkeeping keys is sent as a capability, so
 * anything that is not a real capability has to be filtered out here.
 *
 * W3C rejects a session outright when it sees a non-standard capability without
 * a vendor prefix — "Invalid or unsupported WebDriver capabilities found" — and
 * that failure looks like a broken device rather than a bad config key. Keys
 * starting with `_` are treated as comments so the config can document itself
 * (JSON has no comment syntax) without breaking every session.
 */
const COMMON_CAPS = Object.fromEntries(
  Object.entries(RAW_CAPS).filter(([key]) => !key.startsWith('_')),
);

/**
 * The device slot for THIS worker. cucumber-js sets CUCUMBER_WORKER_ID
 * ("0", "1", ...) per worker process, so `--parallel N` runs scenarios across
 * N workers. Worker i gets the i-th device that is ACTUALLY connected (config
 * intersected with the connected devices) - so a single-device run targets the
 * device truly attached, not blindly the first one in config. Each worker gets
 * a UNIQUE automation port: `appium:systemPort` for UiAutomator2,
 * `appium:wdaLocalPort` for XCUITest — same purpose, different capability name
 * per driver. A single Appium server hosts all sessions by default; override
 * device/server per worker with 1-based env vars (DEVICE_UDID_<n>,
 * DEVICE_NAME_<n>, APPIUM_URL_<n>).
 */
function workerSlot(): { capabilities: Record<string, unknown>; serverUrl: string } {
  const workerId = Number(process.env.CUCUMBER_WORKER_ID ?? '0');
  const n = workerId + 1; // 1-based, for env-var names
  const devices = availableUdids();
  const udid = process.env[`DEVICE_UDID_${n}`] ?? devices[workerId] ?? devices[0];
  const portCap = portCapabilityName();
  const basePort = Number(COMMON_CAPS[portCap]) || defaultBasePort();
  const capabilities: Record<string, unknown> = {
    ...COMMON_CAPS,
    'appium:udid': udid,
    'appium:deviceName': process.env[`DEVICE_NAME_${n}`] ?? udid,
    [portCap]: basePort + workerId,
  };
  // One Appium server can host multiple sessions, so all workers default to the
  // same server; set APPIUM_URL_<n> only if you run a server per device.
  const serverUrl =
    process.env[`APPIUM_URL_${n}`] ??
    process.env.APPIUM_URL ??
    'http://127.0.0.1:4723/';
  return { capabilities, serverUrl };
}

export class DriverManager {
  private driver: Browser | null = null;
  private appPackage: string | null = null;

  async getDriver(): Promise<Browser> {
    if (this.driver) return this.driver;
    const { capabilities, serverUrl } = workerSlot();
    this.appPackage = capabilities['appium:appPackage'] as string;
    const url = new URL(serverUrl);
    const remoteOpts = {
      protocol: url.protocol.replace(':', '') as 'http' | 'https',
      hostname: url.hostname,
      port: Number(url.port) || (url.protocol === 'https:' ? 443 : 4723),
      path: url.pathname,
      capabilities,
      // 'error' (not 'warn') keeps the log readable: a UiAutomator2 crash
      // otherwise floods it with repeated "cannot be proxied / instrumentation
      // not running" retry WARNings. The failing step is still reported by
      // cucumber's own failure output.
      logLevel: 'error' as const,
    };
    // Retry session creation: under parallel load the 2nd device's session can
    // transiently fail to start (ECONNREFUSED / "device not in list" while the
    // shared Appium server is busy spinning up the first session). Back off and
    // retry instead of failing the whole worker.
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        this.driver = await remote(remoteOpts);
        return this.driver;
      } catch (e) {
        lastErr = e;
        const w = Number(process.env.CUCUMBER_WORKER_ID ?? '0') + 1;
        console.log(`[driver] Device ${w} session start failed (attempt ${attempt}/4) — retrying...`);
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
    throw lastErr;
  }

  /**
   * True if the live session still answers. A single cheap command is enough:
   * when the UiAutomator2 instrumentation dies, EVERY command against that
   * session fails, so one probe is as conclusive as ten.
   */
  private async sessionResponds(): Promise<boolean> {
    if (!this.driver) return false;
    try {
      // MUST be a command that goes through the UiAutomator2 instrumentation.
      // getCurrentPackage() does NOT — Appium answers it from adb — so it keeps
      // succeeding after the instrumentation has died, and a health check built
      // on it never detects the very failure it exists to catch. An element
      // lookup is proxied to the instrumentation, so it fails when that is gone.
      // A `false` result is fine: not-found still proves the session answers.
      await (await this.driver.$(HOME_TAB)).isExisting();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Drop this worker's UiAutomator2 port forward.
   *
   * A crashed session leaves its forward (tcp:8200, tcp:8201, ...) bound, and
   * the replacement session asks for the SAME port — so without this the
   * rebuild dies with "UiAutomator2 Server cannot start because the local port
   * #82xx is busy" and every retry repeats it.
   */
  private clearSystemPortForward(): void {
    // adb-only: iOS has no port-forward concept, and XCUITest cleans up WDA
    // itself, so there is nothing to clear.
    if (!usesAdb()) return;
    const workerId = Number(process.env.CUCUMBER_WORKER_ID ?? '0');
    const basePort = Number(COMMON_CAPS[portCapabilityName()]) || defaultBasePort();
    const udid = process.env[`DEVICE_UDID_${workerId + 1}`]
      ?? availableUdids()[workerId] ?? availableUdids()[0];
    if (!udid) return;
    try {
      // Quoted: a re-announced wireless device can have a space in its udid.
      execSync(`adb -s "${udid}" forward --remove tcp:${basePort + workerId}`, { stdio: 'ignore' });
    } catch { /* nothing bound — fine */ }
  }

  /**
   * Make sure the session is usable, rebuilding it if the UiAutomator2
   * instrumentation has died.
   *
   * Why this exists: on a long soak the instrumentation process can crash
   * mid-run ("'POST /element' cannot be proxied to UiAutomator2 server because
   * the instrumentation process is not running"). That state is TERMINAL for
   * the session — every later command fails, including screenshots — so
   * without this a single transient crash at cycle 67 fails cycles 67..100 as
   * well, and the run reports how early the crash happened rather than how the
   * app behaved. Recreating the session costs one failed cycle instead of the
   * whole remainder.
   *
   * Called from the per-scenario Before hook, so recovery lands between cycles.
   * Returns true when the session was rebuilt (i.e. a crash was detected).
   */
  async ensureSessionAlive(): Promise<boolean> {
    if (!this.driver) return false;      // nothing yet — getDriver will create one
    if (await this.sessionResponds()) return false;

    const w = Number(process.env.CUCUMBER_WORKER_ID ?? '0') + 1;
    console.log(`   ⚠⚠ SESSION DEAD — Device ${w} UiAutomator2 instrumentation stopped responding; ` +
      `rebuilding the session`);
    // Best-effort teardown of the dead session so the server drops its state;
    // it is already broken, so failures here are expected and ignored.
    try { await this.driver.deleteSession(); } catch { /* ignore */ }
    this.driver = null;
    // The dead session still holds its systemPort forward; the rebuild asks for
    // the same port and would fail on every retry without this.
    this.clearSystemPortForward();
    await this.getDriver();
    await this.launchApp();
    console.log(`   ⚠⚠ SESSION REBUILT — Device ${w} continuing`);
    return true;
  }

  /**
   * Bring the app to the foreground without killing it first. If the app is
   * already running and showing the Home tab, this is a no-op (saves the
   * terminate+activate+settle latency between scenarios).
   */
  async launchApp(): Promise<void> {
    const d = await this.getDriver();
    if (!this.appPackage) return;
    if (await this.isOnHome()) {
      // Already running on the Home tab — skip the cold start entirely.
      return;
    }
    await d.activateApp(this.appPackage);
    await d.pause(1500);
  }

  /** Force a cold start: terminate then activate. Use only when explicitly needed. */
  async coldStartApp(): Promise<void> {
    const d = await this.getDriver();
    if (!this.appPackage) return;
    try { await d.terminateApp(this.appPackage); } catch { /* ignore */ }
    await d.activateApp(this.appPackage);
    await d.pause(2500);
  }

  private async isOnHome(): Promise<boolean> {
    const d = this.driver;
    if (!d) return false;
    try { return await (await d.$(HOME_TAB)).isExisting(); } catch { return false; }
  }

  /**
   * Ensure the AUT is in the foreground AND the Home grid is showing.
   *   - If a different package is foreground (or the AUT isn't running),
   *     activate it.
   *   - Tap the bottom-nav Home icon (instance 0) so the Home grid is the
   *     currently rendered view, not whichever tab the previous flow left
   *     behind.
   */
  async ensureHomeScreen(): Promise<void> {
    const d = await this.getDriver();
    const pkg = AUT_PACKAGE;
    let foreground = '';
    try { foreground = await d.getCurrentPackage(); } catch { /* ignore */ }
    if (foreground !== pkg) {
      try { await d.activateApp(pkg); } catch { /* ignore */ }
      await d.pause(1500);
    }
    try {
      const homeBtn = await d.$(HOME_NAV_BUTTON);
      if (await homeBtn.isExisting()) {
        await homeBtn.click();
        await d.pause(500);
      }
    } catch { /* ignore */ }
  }

  async stop(): Promise<void> {
    if (!this.driver) return;
    try { await this.driver.deleteSession(); } catch { /* ignore */ }
    this.driver = null;
  }

  async navigateToHome(maxBacks = 6): Promise<boolean> {
    const d = await this.getDriver();
    const homeTabPresent = async () => (await d.$(HOME_TAB)).isExisting();
    const tapHomeTab = async () => {
      try { await (await d.$(HOME_TAB)).click(); } catch { /* ignore */ }
      await d.pause(400);
    };
    // The bottom-nav Home tab exists on every tab (More, Inbox, Agent…) so
    // its presence is not proof we're on the Home grid. Tap it explicitly
    // so the grid is actually showing for whatever runs next.
    //
    // Do NOT try to skip this tap by checking which tab is "selected": the
    // profile screens are reached FROM the Home tab, so the nav bar still
    // reports Home as selected while a sub-screen is displayed. Skipping on
    // that basis leaves the app on the sub-screen and the next scenario fails
    // at its very first step — measured at 37% failures versus 12-18% with the
    // unconditional tap.
    if (await homeTabPresent()) { await tapHomeTab(); return true; }
    for (let i = 0; i < maxBacks; i++) {
      try { await d.back(); } catch { /* ignore */ }
      await d.pause(300);
      if (await homeTabPresent()) { await tapHomeTab(); return true; }
    }
    return false;
  }
}

/** One DriverManager per cucumber-js process (= per worker = per device). */
export const driverManager = new DriverManager();
