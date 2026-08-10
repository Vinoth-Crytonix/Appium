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

    // 1. Authorize — the login screen can appear before the confirmation.
    await authorizeIfPrompted();

    // 2. Confirmation — tap Pay the INSTANT it appears (the confirmation is
    //    time-limited, so no settle pause). On a MERCHANT receiver use a REAL
    //    gesture tap (mobile: clickGesture); a normal/personal confirmation
    //    keeps the standard accessibility click, untouched.
    const payDeadline = Date.now() + 30_000;
    while (Date.now() < payDeadline) {
      if (await this.login.isPrompted()) { await this.login.performLogin(); continue; }
      if (await this.ui.isPresent(L.MERCHANT_PAY_BUTTON)) {
        await this.gestureTapMerchantPay();
        break;
      }
      if (await this.ui.isPresent(L.PAY_CONFIRM)) {
        await this.ui.click(L.PAY_CONFIRM, 5_000);
        break;
      }
      await this.ui.pause(150);
    }

    // 3. A login screen can also appear *after* confirming.
    await this.ui.pause(1500);
    await authorizeIfPrompted();

    // 4. Receipt — capture, then return Home.
    const reachedReceipt = await waitForPresent(this.ui, L.HOME_BUTTON, 30_000);
    await this.diagnostics.screenshot('receipt.png');
    await recordTransaction(this.ui, 'payTo');
    if (reachedReceipt) await this.ui.click(L.HOME_BUTTON);
    await this.ui.pause(700);

    return this.ui.isPresent(L.PAY_TAB);
  }

  /**
   * Tap the confirmation Pay button — targeting the EXACT button
   * (mconformation_submit_button) with a real gesture tap, so the broad
   * PAY_CONFIRM union can't land on an earlier element and the press actually
   * registers on the button. Falls back to the normal click if needed.
   */
  async tapConfirmationPay(): Promise<void> {
    const driver = (this.ui as unknown as { driver: any }).driver;
    try {
      const el = await driver.$(L.MERCHANT_PAY_BUTTON);
      await el.waitForDisplayed({ timeout: 30_000 });
      await driver.execute('mobile: clickGesture', { elementId: el.elementId });
      return;
    } catch {
      /* fall through to the standard click */
    }
    await this.ui.click(L.PAY_CONFIRM, 30_000);
  }

  /**
   * True when the Confirmation is a MERCHANT receiver — identified by its
   * "My Number / Other Number" selector (a personal receiver has none). A
   * merchant payment needs the session-expiry round-trip to complete.
   */
  async isMerchantConfirmation(): Promise<boolean> {
    return this.ui.isPresent(L.MANUAL_PAY_SELECTOR);
  }

  /** Wait for the receipt / success screen to appear. */
  async waitForReceipt(timeoutMs = 30_000): Promise<boolean> {
    return waitForPresent(this.ui, L.RECEIPT_MARKER, timeoutMs);
  }

  /**
   * Tap the merchant-confirmation Pay button with a REAL gesture tap
   * (UiAutomator2 `mobile: clickGesture` — an actual finger down/up at the
   * element), which lands where the accessibility `click()` does not register.
   * Falls back to the standard click if the gesture is unavailable.
   */
  private async gestureTapMerchantPay(): Promise<void> {
    const driver = (this.ui as unknown as { driver: any }).driver;
    try {
      const el = await driver.$(L.MERCHANT_PAY_BUTTON);
      await driver.execute('mobile: clickGesture', { elementId: el.elementId });
    } catch {
      try { await this.ui.click(L.PAY_CONFIRM, 5_000); } catch { /* best-effort */ }
    }
  }
}
