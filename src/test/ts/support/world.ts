/**
 * World + driver lifecycle + hooks + low-level Appium helpers — all in one
 * file. No separate base/hooks/pages folders.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  setWorldConstructor, setDefaultTimeout, World, IWorldOptions,
  Before, After, Status, ITestCaseHookParameter,
} from '@cucumber/cucumber';

setDefaultTimeout(120_000);
import { remote, type Browser } from 'webdriverio';
import caps from '../../resources/config/android.caps.json';

const TARGET_DIR = path.resolve('target');

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
// Hooks
// ---------------------------------------------------------------------------

// Default Before — restart the app to the launch activity so PayTo scenarios
// always start on the home screen.
Before({ tags: 'not @login-only', timeout: 120_000 }, async function (this: TestWorld) {
  this.driver = await remote({
    protocol: 'http',
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: caps as any,
    logLevel: 'warn',
  });
  const pkg = (caps as any)['appium:appPackage'];
  try { await this.driver.terminateApp(pkg); } catch { /* ignore */ }
  await this.driver.activateApp(pkg);
  await this.driver.pause(3500);
});

// Login-only Before — DO NOT restart the app; the device is expected to be
// on the login screen already (no payment side effects).
Before({ tags: '@login-only', timeout: 120_000 }, async function (this: TestWorld) {
  this.driver = await remote({
    protocol: 'http',
    hostname: '127.0.0.1',
    port: 4723,
    path: '/',
    capabilities: caps as any,
    logLevel: 'warn',
  });
});

After({ timeout: 60_000 }, async function (this: TestWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED) {
    try {
      const safe = (scenario.pickle.name || 'scenario').replace(/[^a-z0-9-]+/gi, '_');
      await this.screenshotToTarget(`failure-${safe}.png`);
    } catch { /* ignore */ }
  }
  if (this.driver) {
    try { await this.driver.deleteSession(); } catch { /* ignore */ }
  }
});
