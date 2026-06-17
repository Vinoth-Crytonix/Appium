/**
 * driverManager - owns the Appium session lifecycle, and nothing else.
 *
 * One WebdriverIO session per cucumber-js worker process. The worker's
 * device slot comes from runner/runnerConfig.ts via CUCUMBER_WORKER_ID, so
 * `--parallel 2` runs scenario A on android-1 and scenario B on android-2
 * with no test-code changes. The World, hooks and page objects consume the
 * driver but never create or destroy it.
 */

import { remote, type Browser } from 'webdriverio';
import { getCapsForCurrentWorker } from '../runner/runner';
import { HOME_TAB, HOME_NAV_BUTTON, AUT_PACKAGE } from '../locators/common.locators';

export class DriverManager {
  private driver: Browser | null = null;
  private appPackage: string | null = null;

  async getDriver(): Promise<Browser> {
    if (this.driver) return this.driver;
    const slot = getCapsForCurrentWorker();
    this.appPackage = slot.capabilities['appium:appPackage'] as string;
    const url = new URL(slot.appiumServerUrl);
    this.driver = await remote({
      protocol: url.protocol.replace(':', '') as 'http' | 'https',
      hostname: url.hostname,
      port: Number(url.port) || (url.protocol === 'https:' ? 443 : 4723),
      path: url.pathname,
      capabilities: slot.capabilities,
      logLevel: 'warn',
    });
    return this.driver;
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
