/**
 * VoucherPage — owns the Voucher module ONLY: open its home tile, confirm the
 * module rendered, and leave it.
 *
 * Single Responsibility: it deliberately knows NOTHING about logging in. The
 * module raises the app login screen on every open, but driving that screen is
 * {@link LoginPage}'s job — the login-loop feature composes the two, so this
 * page stays valid for any other Voucher work later.
 *
 * Speed: this page is executed in a tight loop, so every probe here is a
 * UiAutomator resourceId lookup (indexed) rather than an XPath tree walk, and
 * the poll intervals are short. XPath over the voucher WebView costs ~1s a
 * call; the *_UIA locators cost a fraction of that.
 */

import { BasePage } from './basePage';
import { VOUCHER_LOCATORS } from '../locators/voucher.locators';
import { LOGIN_LOCATORS } from '../locators/login.locators';
import { HOME_TAB } from '../locators/common.locators';

export class VoucherPage extends BasePage {
  protected readonly dumpPrefix = 'voucher';

  /**
   * Tap the Voucher tile on the home grid and wait for the module's response —
   * which is the login screen on every open, or (should the app ever stop
   * demanding auth) the module itself. Returns as soon as either is up.
   */
  async openFromHome(timeoutMs = 20_000): Promise<void> {
    await this.ui.click(VOUCHER_LOCATORS.VOUCHER_TILE, timeoutMs);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      // Login screen is native, so the fast UiSelector probe is safe here.
      if (await this.ui.isPresent(LOGIN_LOCATORS.PASSWORD_FIELD_UIA)) return;
      // The module is the WebView — XPath only. A UiSelector probe against it
      // crashes the UiAutomator2 instrumentation (see voucher.locators.ts).
      if (await this.ui.isPresent(VOUCHER_LOCATORS.VOUCHER_MODULE)) return;
      await this.ui.pause(150);
    }
    await this.dump('tile-tapped-no-screen');
  }

  /**
   * True once the voucher catalogue is rendered.
   *
   * Polls the XPath locator, not the UiSelector one: this screen IS the
   * WebView, and a UiSelector probe over its accessibility tree crashes the
   * UiAutomator2 instrumentation outright (see voucher.locators.ts). XPath
   * costs more per query, but it is the only probe that survives here — and a
   * crashed instrumentation ends the whole loop, not just this cycle.
   */
  async isModuleShown(timeoutMs = 30_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.ui.isPresent(VOUCHER_LOCATORS.VOUCHER_MODULE)) return true;
      await this.ui.pause(150);
    }
    await this.dump('module-not-shown');
    return false;
  }

  /**
   * Leave the module and return to the home grid. Device Back is the exit —
   * it is one command against the app, whereas locating the in-page back
   * arrow costs an XPath query on the WebView. Re-presses Back until the home
   * tab is up (a still-loading WebView can swallow the first press).
   */
  async leaveModule(maxBacks = 4): Promise<boolean> {
    for (let i = 0; i < maxBacks; i++) {
      await this.ui.back();
      // Poll rather than sleep a fixed beat: Home usually renders well inside
      // the first interval, so a cycle rarely pays the full wait.
      for (let waited = 0; waited < 1_800; waited += 200) {
        await this.ui.pause(200);
        // XPath, not the UiSelector probe: the WebView may still be on screen
        // during the first presses, and a UiSelector lookup there crashes the
        // instrumentation (see voucher.locators.ts).
        if (await this.ui.isPresent(HOME_TAB)) return true;
      }
    }
    await this.dump('exit-not-home');
    return false;
  }
}
