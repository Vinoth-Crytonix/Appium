/**
 * LoginPage — owns the login screen ONLY: enter password, tap Login.
 *
 * Single Responsibility: confirmation Pay, receipts and home navigation are
 * deliberately NOT here — those belong to the flow that triggered the login.
 * Other pages depend on this page (via `isPrompted()` / `performLogin()`)
 * whenever the app demands re-authentication mid-flow.
 */

import { BasePage } from './BasePage';
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

  /** True if the login screen is currently prompting for credentials. */
  async isPrompted(): Promise<boolean> {
    return this.ui.isPresent(LOGIN_LOCATORS.PASSWORD_FIELD);
  }

  /** True once the login screen is gone (password field no longer present). */
  async isDismissed(): Promise<boolean> {
    return !(await this.ui.isPresent(LOGIN_LOCATORS.PASSWORD_FIELD));
  }

  /** Enter credentials and tap Login. NOTHING else — see the class comment. */
  async performLogin(password: string = testData.login.password): Promise<void> {
    await this.ui.sendKeys(LOGIN_LOCATORS.PASSWORD_FIELD, password);
    await this.ui.hideKeyboard();
    await this.ui.pause(500);
    await this.ui.click(LOGIN_LOCATORS.LOGIN_BUTTON);
    await this.ui.pause(6000);
  }
}
