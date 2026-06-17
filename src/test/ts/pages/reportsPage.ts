/**
 * ReportsPage - drives the Reports flow: More tile -> Report -> All
 * Transaction Details, plus the PDF preview, Search, Share, and Statistics
 * (graph) sub-screens.
 *
 * Global login is handled by the AfterStep loginHooks (see hooks/loginHooks.ts),
 * so this page does not inject LoginPage.
 */

import { BasePage, type PageContext } from './basePage';
import { REPORTS_LOCATORS as L } from '../locators/reports.locators';
import { waitForPresent } from '../support/waits';

export type GraphType = 'Bar Graph' | 'Pie Graph' | 'Line Graph';

export class ReportsPage extends BasePage {
  protected readonly dumpPrefix = 'reports';

  // ---- Launch helpers --------------------------------------------------

  /** True if the home screen marker is currently visible. */
  async isOnHome(timeoutMs = 1500): Promise<boolean> {
    return waitForPresent(this.ui, L.HOME_TAB, timeoutMs);
  }

  // ---- Navigation: Home -> More -> Report -> All Txn Details -----------

  async tapMore(): Promise<void> {
    await this.ui.click(L.MORE_TILE);
    await this.ui.pause(800);
  }

  async waitForMoreScreen(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.MORE_SCREEN_HEADER, timeoutMs);
  }

  async tapReport(): Promise<void> {
    await this.ui.click(L.REPORT_OPTION);
    await this.ui.pause(800);
  }

  async waitForReportScreen(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.REPORT_SCREEN_HEADER, timeoutMs);
  }

  async tapAllTransactionDetails(): Promise<void> {
    await this.ui.click(L.ALL_TXN_DETAILS_OPTION);
    await this.ui.pause(800);
  }

  async waitForTxnDetailScreen(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.TXN_DETAIL_SCREEN_HEADER, timeoutMs);
  }

  // ---- Scroll gestures -------------------------------------------------

  async scrollDownList(times = 3): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.ui.scroll('down');
      await this.ui.pause(300);
    }
  }

  async scrollToTop(times = 6): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.ui.scroll('up');
      await this.ui.pause(250);
    }
  }

  async scrollHorizontalRightToLeft(times = 4): Promise<void> {
    for (let i = 0; i < times; i++) {
      // mobile: scrollGesture 'left' moves content leftwards (reveal right side).
      // For "right to left until screen end" we swipe content leftwards.
      await this.ui.scroll('left');
      await this.ui.pause(300);
    }
  }

  // ---- PDF preview -----------------------------------------------------

  async tapFirstPdfIcon(): Promise<void> {
    await this.ui.click(L.FIRST_PDF_ICON);
    await this.ui.pause(1200);
  }

  async waitForPdfPreview(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.PDF_PREVIEW_SCREEN, timeoutMs);
  }

  async pressBack(): Promise<void> {
    await this.ui.back();
    await this.ui.pause(800);
  }

  // ---- Search ----------------------------------------------------------

  async tapSearchIcon(): Promise<void> {
    await this.ui.click(L.SEARCH_ICON);
    await this.ui.pause(600);
  }

  async typeSearch(value: string): Promise<void> {
    await this.ui.sendKeys(L.SEARCH_INPUT, value);
    await this.ui.pause(800);
    await this.ui.hideKeyboard();
  }

  /** Clear the current search to prepare for the next query. */
  async clearSearch(): Promise<void> {
    try {
      await this.ui.sendKeys(L.SEARCH_INPUT, '');
    } catch { /* ignore - best effort */ }
  }

  /** True once the list re-renders (best-effort: list container present). */
  async hasResults(timeoutMs = 5_000): Promise<boolean> {
    return waitForPresent(this.ui, L.TXN_DETAIL_LIST, timeoutMs);
  }

  // ---- Share -----------------------------------------------------------

  async tapShareIcon(): Promise<void> {
    await this.ui.click(L.SHARE_ICON);
    await this.ui.pause(800);
  }

  async selectSharePdf(): Promise<void> {
    await this.ui.click(L.SHARE_PDF_OPTION);
    await this.ui.pause(1200);
  }

  async waitForPdfSharePreview(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.PDF_SHARE_PREVIEW, timeoutMs);
  }

  // ---- Statistics ------------------------------------------------------

  async tapStatisticsIcon(): Promise<void> {
    await this.ui.click(L.STATISTICS_ICON);
    await this.ui.pause(1000);
  }

  async waitForStatisticsScreen(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.TXN_DETAIL_STATISTICS_SCREEN, timeoutMs);
  }

  async tapMobileNumberDropdown(): Promise<void> {
    await this.ui.click(L.MOBILE_NUMBER_DROPDOWN);
    await this.ui.pause(600);
  }

  async selectFirstMobileNumber(): Promise<void> {
    await this.ui.click(L.FIRST_MOBILE_NUMBER_OPTION);
    await this.ui.pause(800);
  }

  // ---- Graph (Kebab) ---------------------------------------------------

  async tapKebabMenu(): Promise<void> {
    await this.ui.click(L.KEBAB_MENU);
    await this.ui.pause(500);
  }

  async selectGraph(label: GraphType): Promise<void> {
    await this.ui.click(L.graphOption(label));
    await this.ui.pause(1000);
  }

  async waitForGraph(label: GraphType, timeoutMs = 10_000): Promise<boolean> {
    const marker = label === 'Bar Graph' ? L.BAR_GRAPH_MARKER
      : label === 'Pie Graph' ? L.PIE_GRAPH_MARKER
      : L.LINE_GRAPH_MARKER;
    return waitForPresent(this.ui, marker, timeoutMs);
  }

  // ---- Back navigation -------------------------------------------------

  /** Press back repeatedly until More screen header is visible (capped). */
  async backUntilMoreScreen(maxPresses = 5): Promise<boolean> {
    for (let i = 0; i < maxPresses; i++) {
      if (await this.ui.isPresent(L.MORE_SCREEN_HEADER)) return true;
      await this.ui.back();
      await this.ui.pause(700);
    }
    return this.ui.isPresent(L.MORE_SCREEN_HEADER);
  }
}
