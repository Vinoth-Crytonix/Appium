/**
 * RecentTransactionsPage - drives the Recent Transactions screen.
 *
 * Owns: entry from home, tab switching (All / Debit / Credit), scrolling the
 * list, and the conditional "Send Again" tap. When Send Again routes through
 * a login prompt, the injected LoginPage handles it - same pattern as PayTo.
 */

import { BasePage, type PageContext } from './basePage';
import type { LoginPage } from './loginPage';
import { RECENT_TXN_LOCATORS as L } from '../locators/recentTransactions.locators';
import { waitForPresent } from '../support/waits';

export type TxnTab = 'All' | 'Debit' | 'Credit';

export class RecentTransactionsPage extends BasePage {
  protected readonly dumpPrefix = 'recentTxn';

  constructor(ctx: PageContext, private readonly login: LoginPage) {
    super(ctx);
  }

  // ---- Navigation -------------------------------------------------------

  async openFromHome(): Promise<void> {
    await this.ui.click(L.RECENT_TXN_ENTRY);
    await this.ui.pause(1000);
    // If the app prompts for re-auth before the screen appears, handle it.
    if (await this.login.isPrompted()) {
      await this.login.performLogin();
    }
  }

  /** Poll for the Recent Transactions screen header. */
  async waitForScreen(timeoutMs = 20_000): Promise<boolean> {
    return waitForPresent(this.ui, L.SCREEN_HEADER, timeoutMs);
  }

  /** Poll for the home Pay tab - used after pressing back. */
  async waitForHome(timeoutMs = 20_000): Promise<boolean> {
    return waitForPresent(this.ui, L.HOME_TAB, timeoutMs);
  }

  /** Poll for the Pay screen header - used after Send Again. */
  async waitForPayScreen(timeoutMs = 20_000): Promise<boolean> {
    return waitForPresent(this.ui, L.PAY_SCREEN_HEADER, timeoutMs);
  }

  async pressBack(): Promise<void> {
    // Single device-back. Used by both recentTransactions and merchant flows,
    // so we must NOT over-navigate — one back press, that's it.
    await this.ui.back();
    await this.ui.pause(900);
    // RT-specific quirk: on the Pay screen the first back may be eaten by
    // keyboard/focus; retry until the Pay screen is gone.
    let attempt = 0;
    while (attempt < 2 && (await this.ui.isPresent(L.PAY_SCREEN_HEADER))) {
      attempt++;
      await this.ui.back();
      await this.ui.pause(900);
    }
  }

  /** Re-open Recent Transactions from Home if back-navigation overshot. */
  async ensureBackOnRecentTransactions(): Promise<void> {
    if (await this.ui.isPresent(L.SCREEN_HEADER)) return;
    if (await this.ui.isPresent(L.HOME_TAB) && (await this.ui.isPresent(L.RECENT_TXN_ENTRY))) {
      await this.ui.click(L.RECENT_TXN_ENTRY);
      await this.ui.pause(800);
    }
  }

  // ---- Tabs -------------------------------------------------------------

  async switchTab(tab: TxnTab): Promise<void> {
    const selector = tab === 'All' ? L.TAB_ALL
      : tab === 'Debit' ? L.TAB_DEBIT
      : L.TAB_CREDIT;
    await this.ui.click(selector);
    await this.ui.pause(800);
  }

  // ---- Scrolling --------------------------------------------------------

  /**
   * Scroll the transaction list. Kept short (2 pages each way) because the
   * list is usually short and the test mainly needs to exercise the gesture.
   */
  async scrollList(times = 2): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.ui.scroll('down');
      await this.ui.pause(300);
    }
    for (let i = 0; i < times; i++) {
      await this.ui.scroll('up');
      await this.ui.pause(200);
    }
  }

  // ---- Send Again -------------------------------------------------------

  /** True if at least one "Send Again" button is currently visible. */
  async hasSendAgain(): Promise<boolean> {
    return this.ui.isPresent(L.SEND_AGAIN_BUTTON);
  }

  /**
   * Tap the first available "Send Again" button. Returns false if no row in
   * the current tab exposes it (caller skips the rest of the sub-scenario).
   */
  async tapFirstSendAgain(): Promise<boolean> {
    if (!(await this.hasSendAgain())) return false;
    await this.ui.click(L.SEND_AGAIN_BUTTON);
    await this.ui.pause(1500);
    if (await this.login.isPrompted()) {
      await this.login.performLogin();
    }
    return true;
  }
}
