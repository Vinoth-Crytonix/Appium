/**
 * DriverManager — owns the Appium session lifecycle, and nothing else.
 *
 * Single Responsibility: this class is the sole authority over *when* the
 * WebdriverIO session exists. The session is created once per cucumber-js
 * process and shared by every scenario; the World, the hooks and the page
 * objects all consume the driver but never create or destroy it.
 */

import { remote, type Browser } from 'webdriverio';
import caps from '../../resources/config/android.caps.json';
import { HOME_TAB } from '../locators/common.locators';

const APP_PACKAGE = (caps as Record<string, unknown>)['appium:appPackage'] as string;

export class DriverManager {
  private driver: Browser | null = null;

  /** Start the session if it is not already running; return the shared one. */
  async getDriver(): Promise<Browser> {
    if (this.driver) return this.driver;
    this.driver = await remote({
      protocol: 'http',
      hostname: '127.0.0.1',
      port: 4723,
      path: '/',
      capabilities: caps as Record<string, unknown>,
      logLevel: 'warn',
    });
    return this.driver;
  }

  /** Cold-launch the app under test (terminate then activate). */
  async launchApp(): Promise<void> {
    const d = await this.getDriver();
    try { await d.terminateApp(APP_PACKAGE); } catch { /* ignore */ }
    await d.activateApp(APP_PACKAGE);
    await d.pause(3500);
  }

  /** Tear the session down (best-effort) at the end of the run. */
  async stop(): Promise<void> {
    if (!this.driver) return;
    try { await this.driver.deleteSession(); } catch { /* ignore */ }
    this.driver = null;
  }

  /** Gentle navigation back to the home screen — never restarts the app. */
  async navigateToHome(maxBacks = 6): Promise<boolean> {
    const d = await this.getDriver();
    const isOnHome = async () => (await d.$(HOME_TAB)).isExisting();
    for (let i = 0; i < maxBacks; i++) {
      if (await isOnHome()) return true;
      try { await d.back(); } catch { /* ignore */ }
      await d.pause(800);
    }
    return isOnHome();
  }
}

/** Process-wide singleton — one Appium session for the whole cucumber run. */
export const driverManager = new DriverManager();
