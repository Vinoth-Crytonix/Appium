/**
 * PayToPage — drives the account-to-account "PayTo" payment flow.
 *
 * Payment completion (confirmation Pay tap, receipt screenshot, Home tap)
 * lives here. When the app demands re-authentication after Submit, this page
 * delegates to the injected {@link LoginPage} — it does not re-implement
 * login. That delegation is the Dependency-Inversion seam between the two.
 */

import { BasePage, type PageContext } from './BasePage';
import type { LoginPage } from './LoginPage';
import { PAYTO_LOCATORS as L } from '../locators/payto.locators';
import { waitForPresent } from '../utils/waits';
import { randomAmount } from '../utils/random';
import testData from '../../resources/data/testdata.json';

export class PayToPage extends BasePage {
  protected readonly dumpPrefix = 'payto';

  constructor(ctx: PageContext, private readonly login: LoginPage) {
    super(ctx);
  }

  /** Poll for the home screen's Pay tab; returns whether it appeared. */
  async waitForHome(timeoutMs = 30_000): Promise<boolean> {
    return waitForPresent(this.ui, L.PAY_TAB, timeoutMs);
  }

  async tapPayTab(): Promise<void> {
    await this.ui.click(L.PAY_TAB);
    await this.ui.pause(2500);
  }

  /** Enter an account number if the field is on screen (no-op otherwise). */
  async enterAccount(account: string): Promise<void> {
    if (!(await this.ui.isPresent(L.ACCOUNT_FIELD))) return;
    await this.ui.sendKeys(L.ACCOUNT_FIELD, account);
    await this.ui.pause(700);
    await this.ui.performImeDone();
    await this.ui.pause(800);
  }

  /** Enter the account number from test data. */
  async enterConfiguredAccount(): Promise<void> {
    await this.enterAccount(testData.payTo.account);
  }

  /** Enter a random amount with at most `maxDigits` digits. */
  async enterRandomAmount(maxDigits: number): Promise<void> {
    await this.ui.sendKeys(L.AMOUNT_FIELD, randomAmount(maxDigits));
    await this.ui.pause(400);
  }

  async enterRemarks(remarks: string): Promise<void> {
    await this.ui.sendKeys(L.REMARKS_FIELD, remarks);
    await this.ui.hideKeyboard();
    await this.ui.pause(500);
  }

  async tapSubmit(): Promise<void> {
    await this.ui.click(L.SUBMIT_BUTTON);
    await this.ui.pause(4000);
  }

  /**
   * Finish the payment: authorize if prompted, confirm on the Pay screen,
   * capture the receipt, return Home. Returns whether we landed back home.
   */
  async completePayment(): Promise<boolean> {
    // 1. Authorize — delegate to LoginPage if the login screen appeared.
    if (await this.login.isPrompted()) {
      await this.login.performLogin();
    }

    // 2. Confirmation — wait for the real Pay button to render, then tap.
    await this.ui.waitForDisplayed(L.PAY_CONFIRM, 30_000);
    await this.ui.click(L.PAY_CONFIRM);
    await this.ui.pause(7000);

    // 3. Receipt.
    await this.diagnostics.screenshot('receipt.png');

    // 4. Home.
    await this.ui.click(L.HOME_BUTTON);
    await this.ui.pause(2500);

    return this.ui.isPresent(L.PAY_TAB);
  }
}
