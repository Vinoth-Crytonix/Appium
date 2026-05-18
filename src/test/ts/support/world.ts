/**
 * World + driver lifecycle + hooks + low-level Appium helpers.
 *
 * Driver lifecycle is *per cucumber-js process* (BeforeAll / AfterAll), not
 * per scenario — the app is launched once at the start of the run and every
 * scenario uses the same session. Between scenarios we just navigate back to
 * the home screen (no terminate/activate).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  setWorldConstructor, setDefaultTimeout, World, IWorldOptions,
  BeforeAll, AfterAll, Before, After, Status, ITestCaseHookParameter,
} from '@cucumber/cucumber';

setDefaultTimeout(120_000);
import { remote, type Browser } from 'webdriverio';
import caps from '../../resources/config/android.caps.json';

const TARGET_DIR = path.resolve('target');
const HOME_TAB   = '//android.widget.TextView[@text="Pay" or @text="ငွေပေး"]';
const PKG        = (caps as any)['appium:appPackage'];

// ---------------------------------------------------------------------------
// Shared driver — one Appium session for the whole cucumber-js process.
// ---------------------------------------------------------------------------

let sharedDriver: Browser | null = null;

async function startDriverOnce(): Promise<Browser> {
  if (sharedDriver) return sharedDriver;
  sharedDriver = await remote({
    protocol: 'http',
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: caps as any,
    logLevel: 'warn',
  });
  return sharedDriver;
}

async function stopDriverOnce(): Promise<void> {
  if (!sharedDriver) return;
  try { await sharedDriver.deleteSession(); } catch { /* ignore */ }
  sharedDriver = null;
}

async function isOnHome(d: Browser): Promise<boolean> {
  const el = await d.$(HOME_TAB);
  return el.isExisting();
}

/** Gentle navigation back to home — never restarts the app. */
async function navigateToHome(d: Browser, maxBacks = 6): Promise<boolean> {
  for (let i = 0; i < maxBacks; i++) {
    if (await isOnHome(d)) return true;
    try { await d.back(); } catch { /* ignore */ }
    await d.pause(800);
  }
  return isOnHome(d);
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export class TestWorld extends World {
  driver!: Browser;

  constructor(options: IWorldOptions) {
    super(options);
  }

  // ----- low-level Appium helpers -----

  async click(selector: string, timeout = 15000): Promise<void> {
    const el = await this.driver.$(selector);
    await el.waitForDisplayed({ timeout });
    try {
      await this.driver.execute('mobile: clickGesture', { elementId: el.elementId });
    } catch {
      await el.click();
    }
  }

  async sendKeys(selector: string, text: string, timeout = 15000): Promise<void> {
    const el = await this.driver.$(selector);
    await el.waitForDisplayed({ timeout });
    try {
      await this.driver.execute('mobile: clickGesture', { elementId: el.elementId });
    } catch {
      await el.click();
    }
    await this.driver.pause(400);
    try { await el.clearValue(); } catch { /* ignore */ }
    await el.setValue(text);
  }

  async isPresent(selector: string): Promise<boolean> {
    const el = await this.driver.$(selector);
    return el.isExisting();
  }

  async hideKeyboard(): Promise<void> {
    try { await this.driver.hideKeyboard(); } catch { /* ignore */ }
  }

  async performImeDone(): Promise<void> {
    try { await this.driver.execute('mobile: performEditorAction', { action: 'done' }); }
    catch { await this.hideKeyboard(); }
  }

  /**
   * Type digits via Android keycodes — works against custom on-screen keypads
   * (e.g. com.jas.digitalkyats:id/keyboardview) that WDIO's setValue cannot
   * reach because they render as a single canvas-drawn android.view.View.
   */
  async typeDigits(selector: string, digits: string, timeout = 15000): Promise<void> {
    const el = await this.driver.$(selector);
    await el.waitForDisplayed({ timeout });
    try {
      await this.driver.execute('mobile: clickGesture', { elementId: el.elementId });
    } catch {
      await el.click();
    }
    await this.driver.pause(400);
    for (const d of digits) {
      const keycode = 7 + parseInt(d, 10);  // KEYCODE_0=7 ... KEYCODE_9=16
      await this.driver.execute('mobile: pressKey', { keycode });
      await this.driver.pause(80);
    }
  }

  async pause(ms: number): Promise<void> {
    await this.driver.pause(ms);
  }

  async backNavigateUntil(markerSelector: string, maxBacks = 6): Promise<void> {
    for (let i = 0; i < maxBacks; i++) {
      if (await this.isPresent(markerSelector)) return;
      await this.driver.back();
      await this.pause(800);
    }
  }

  async screenshotToTarget(fileName: string): Promise<void> {
    const png = await this.driver.takeScreenshot();
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    fs.writeFileSync(path.join(TARGET_DIR, fileName), png, 'base64');
  }
}

setWorldConstructor(TestWorld);

// ---------------------------------------------------------------------------
// Hooks — per-RUN lifecycle (BeforeAll / AfterAll) + per-scenario navigation
// ---------------------------------------------------------------------------

// Launch the app ONCE at the start of the cucumber-js process.
BeforeAll({ timeout: 120_000 }, async function () {
  const d = await startDriverOnce();
  try { await d.terminateApp(PKG); } catch { /* ignore */ }
  await d.activateApp(PKG);
  await d.pause(3500);
});

// Kill the session ONCE at the end of the cucumber-js process.
AfterAll({ timeout: 60_000 }, async function () {
  await stopDriverOnce();
});

// Per-scenario Before — attach the shared driver and ensure we're on home.
// NO terminateApp / activateApp here; the app is already running.
Before({ tags: 'not @login-only', timeout: 60_000 }, async function (this: TestWorld) {
  this.driver = await startDriverOnce();
  await navigateToHome(this.driver, 6);
});

// @login-only scenarios expect the device to already be on the login screen.
Before({ tags: '@login-only', timeout: 60_000 }, async function (this: TestWorld) {
  this.driver = await startDriverOnce();
});

After({ timeout: 60_000 }, async function (this: TestWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED) {
    try {
      const safe = (scenario.pickle.name || 'scenario').replace(/[^a-z0-9-]+/gi, '_');
      await this.screenshotToTarget(`failure-${safe}.png`);
    } catch { /* ignore */ }
  }
  // Do NOT delete the session here — it lives for the whole run.
});
