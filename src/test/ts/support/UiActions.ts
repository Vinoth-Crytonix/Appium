/**
 * Concrete {@link IUiActions} implementation backed by a WebdriverIO session.
 *
 * Single Responsibility: this class does exactly one job — translate the
 * suite's primitive interaction vocabulary into WebdriverIO / Appium calls.
 * It owns no test logic, no locators, and no lifecycle; it is the only place
 * the raw `Browser` is touched.
 */

import type { Browser } from 'webdriverio';
import type { IUiActions } from './IUiActions';

const DEFAULT_TIMEOUT = 15_000;

export class UiActions implements IUiActions {
  constructor(private readonly driver: Browser) {}

  async click(selector: string, timeoutMs = DEFAULT_TIMEOUT): Promise<void> {
    const el = await this.driver.$(selector);
    await el.waitForDisplayed({ timeout: timeoutMs });
    try {
      await this.driver.execute('mobile: clickGesture', { elementId: el.elementId });
    } catch {
      await el.click();
    }
  }

  async sendKeys(selector: string, text: string, timeoutMs = DEFAULT_TIMEOUT): Promise<void> {
    const el = await this.driver.$(selector);
    await el.waitForDisplayed({ timeout: timeoutMs });
    try {
      await this.driver.execute('mobile: clickGesture', { elementId: el.elementId });
    } catch {
      await el.click();
    }
    await this.driver.pause(150);
    try { await el.clearValue(); } catch { /* ignore */ }
    await el.setValue(text);
  }

  /**
   * Type digits via Android keycodes — works against custom on-screen keypads
   * (e.g. com.jas.digitalkyats:id/keyboardview) that WDIO's setValue cannot
   * reach because they render as a single canvas-drawn android.view.View.
   */
  async typeDigits(selector: string, digits: string, timeoutMs = DEFAULT_TIMEOUT): Promise<void> {
    const el = await this.driver.$(selector);
    await el.waitForDisplayed({ timeout: timeoutMs });
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

  async isPresent(selector: string): Promise<boolean> {
    // Tolerate transient proxy / instrumentation errors: the UiAutomator2
    // server on this build can crash and auto-restart mid-flow, during which
    // `$`/`isExisting` reject with "socket hang up" / "instrumentation process
    // is not running". Returning false here lets the surrounding poll loops
    // keep retrying until the server recovers, instead of hard-failing the run.
    try {
      const el = await this.driver.$(selector);
      return await el.isExisting();
    } catch {
      return false;
    }
  }

  async isDisplayed(selector: string): Promise<boolean> {
    try {
      const el = await this.driver.$(selector);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async waitForDisplayed(selector: string, timeoutMs = DEFAULT_TIMEOUT): Promise<void> {
    const el = await this.driver.$(selector);
    await el.waitForDisplayed({ timeout: timeoutMs });
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

  async back(): Promise<void> {
    await this.driver.back();
  }

  /** Replay one tap as a W3C pointer down/up — mirrors Appium Inspector output. */
  async tapAt(x: number, y: number): Promise<void> {
    await this.driver.performActions([
      {
        type: 'pointer',
        id: 'finger',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 50 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await this.driver.releaseActions();
  }

  async scroll(direction: 'up' | 'down' | 'left' | 'right'): Promise<void> {
    try {
      await this.driver.execute('mobile: scrollGesture', {
        left: 0, top: 200, width: 720, height: 1200,
        direction, percent: 0.6,
      });
    } catch { /* ignore */ }
  }

  async getPageSource(): Promise<string> {
    return this.driver.getPageSource();
  }

  async takeScreenshot(): Promise<string> {
    return this.driver.takeScreenshot();
  }
}
