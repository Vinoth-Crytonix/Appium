/**
 * LoginPage â€” owns the login screen ONLY: enter password, tap Login.
 *
 * Single Responsibility: confirmation Pay, receipts and home navigation are
 * deliberately NOT here â€” those belong to the flow that triggered the login.
 * Other pages depend on this page (via `isPrompted()` / `performLogin()`)
 * whenever the app demands re-authentication mid-flow.
 */

import { BasePage } from './basePage';
import { LOGIN_LOCATORS } from '../locators/login.locators';
import testData from '../../resources/data/testdata.json';

export class LoginPage extends BasePage {
  protected readonly dumpPrefix = 'login';

  /** Wait for the login screen, then report whether it is shown. */
  async isShown(timeoutMs = 20_000): Promise<boolean> {
    try {
      await this.ui.waitForDisplayed(LOGIN_LOCATORS.PASSWORD_FIELD, timeoutMs);
    } catch { /* fall through to the presence check */ }
    return this.ui.isPresent(LOGIN_LOCATORS.PASSWORD_FIELD);
  }

  /** True if the login screen is currently prompting for credentials.
   *  Uses the UiAutomator resourceId probe: this runs after every step of
   *  every scenario (loginHooks) and in tight poll loops, where an XPath
   *  tree walk is the dominant cost — especially on WebView screens. */
  async isPrompted(): Promise<boolean> {
    return this.ui.isPresent(LOGIN_LOCATORS.PASSWORD_FIELD_UIA);
  }

  /** True once the login screen is gone (password field no longer present). */
  async isDismissed(): Promise<boolean> {
    return !(await this.ui.isPresent(LOGIN_LOCATORS.PASSWORD_FIELD));
  }

  /** Enter credentials and tap Login. NOTHING else â€” see the class comment. */
  async performLogin(password: string = testData.login.password): Promise<void> {
    await this.ui.sendKeys(LOGIN_LOCATORS.PASSWORD_FIELD, password);
    await this.ui.hideKeyboard();
    await this.ui.pause(200);
    await this.ui.click(LOGIN_LOCATORS.LOGIN_BUTTON);
    // Wait for the login to actually submit (password field gone) rather than
    // a blanket pause — returns the instant it clears, capped so a slow/again
    // prompt cannot hang the flow.
    const deadline = Date.now() + 8_000;
    while (Date.now() < deadline) {
      if (!(await this.ui.isPresent(LOGIN_LOCATORS.PASSWORD_FIELD_UIA))) return;
      await this.ui.pause(150);
    }
  }
}
