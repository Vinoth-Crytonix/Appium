/**
 * PayToPage â€” drives the account-to-account "PayTo" payment flow.
 *
 * Payment completion (confirmation Pay tap, receipt screenshot, Home tap)
 * lives here. When the app demands re-authentication after Submit, this page
 * delegates to the injected {@link LoginPage} â€” it does not re-implement
 * login. That delegation is the Dependency-Inversion seam between the two.
 */

import { BasePage, type PageContext } from './basePage';
import type { LoginPage } from './loginPage';
import { PAYTO_LOCATORS as L } from '../locators/payto.locators';
import { waitForPresent } from '../support/waits';
import { randomAmount } from '../support/random';
import { recordTransaction } from '../support/transactionLog';
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
    await this.ui.waitForDisplayed(L.PAY_TAB, 15_000);
    await this.ui.click(L.PAY_TAB);
    // Wait for the PayTo form to actually render before returning.
    await waitForPresent(this.ui, L.ACCOUNT_FIELD, 15_000);
  }

  /** Enter an account number — waits for the field to appear. */
  async enterAccount(account: string): Promise<void> {
    if (!(await waitForPresent(this.ui, L.ACCOUNT_FIELD, 10_000))) return;
    await this.ui.sendKeys(L.ACCOUNT_FIELD, account);
    await this.ui.pause(500);
    await this.ui.performImeDone();
    await this.ui.pause(500);
  }

  /** Enter the account number from test data. */
  async enterConfiguredAccount(): Promise<void> {
    await this.enterAccount(testData.payTo.account);
  }

  /** Enter a random amount with at most `maxDigits` digits — waits for field. */
  async enterRandomAmount(maxDigits: number): Promise<void> {
    await this.ui.waitForDisplayed(L.AMOUNT_FIELD, 30_000);
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
    await this.ui.pause(1000);
  }

  /**
   * Finish the payment: authorize if prompted, confirm on the Pay screen,
   * capture the receipt, return Home. Returns whether we landed back home.
   */
  async completePayment(): Promise<boolean> {
    const authorizeIfPrompted = async () => {
      if (await this.login.isPrompted()) await this.login.performLogin();
    };

    // 1. Authorize — the login screen can appear before the confirmation tap.
    await authorizeIfPrompted();

    // 2. Confirmation — PAY_CONFIRM only matches the Pay button once it is
    //    ENABLED, so this waits out the brief greyed/disabled window instead of
    //    tapping a dead button and stranding the flow on the confirm screen.
    await this.ui.click(L.PAY_CONFIRM, 30_000);

    // 3. A login prompt can also appear *after* confirming.
    await this.ui.pause(1500);
    await authorizeIfPrompted();

    // 4. Receipt — the success screen can show a processing animation for a few
    //    seconds, so poll for the Home button rather than assuming it is there.
    const reachedReceipt = await waitForPresent(this.ui, L.HOME_BUTTON, 30_000);
    await this.diagnostics.screenshot('receipt.png');
    await recordTransaction(this.ui, 'payTo');
    if (reachedReceipt) await this.ui.click(L.HOME_BUTTON);
    await this.ui.pause(700);

    return this.ui.isPresent(L.PAY_TAB);
  }
}
