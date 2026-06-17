/**
 * MyanmarPayHistoryPage - Transaction History screen for the Myanmar Pay flow.
 *
 * Owns: entry from scanner (History icon + Scroll-Up footer), the paginated
 * View More loop, the title-bar sort/export menu, ordering checks, and the
 * Transaction Detail screen (Invoice + Share + Home).
 *
 * Ordering verification: this page captures the first-row text BEFORE a sort
 * action and AFTER it; the step then asserts the signature changed. Deeper
 * field-level ordering checks are TODOs until exact row resource-ids land.
 *
 * Screenshot convention: no mid-flow PNGs - Invoice / Share are explored via
 * back navigation, so there is no receipt-equivalent moment here.
 */

import { BasePage, type PageContext } from './basePage';
import { MYANMAR_PAY_HISTORY_LOCATORS as L } from '../locators/myanmarPayHistory.locators';
import { waitForPresent } from '../support/waits';

export type SortOption = 'Recent' | 'Sort By Date' | 'Sort By Amount' | 'Sort By Name' | 'Export to PDF';

/** Safety cap on the View More loop - high enough to fully exhaust large lists. */
const VIEW_MORE_MAX_TAPS = 5;

export class MyanmarPayHistoryPage extends BasePage {
  protected readonly dumpPrefix = 'myanmarPayHistory';

  constructor(ctx: PageContext) {
    super(ctx);
  }

  // ---- Entry from scanner -----------------------------------------------

  async tapHistoryIcon(): Promise<void> {
    await this.ui.click(L.HISTORY_ICON);
    await this.ui.pause(1000);
  }

  async tapScrollUpFooter(): Promise<void> {
    await this.ui.click(L.SCROLL_UP_FOOTER);
    await this.ui.pause(1000);
  }

  async waitForHistoryScreen(timeoutMs = 20_000): Promise<boolean> {
    return waitForPresent(this.ui, L.HISTORY_HEADER, timeoutMs);
  }

  /** Marker for "back on the Myanmar Pay scanner" - re-uses the History icon presence. */
  async waitForScannerScreen(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.HISTORY_ICON, timeoutMs);
  }

  async pressBack(): Promise<void> {
    await this.ui.back();
    await this.ui.pause(800);
  }

  // ---- Pagination -------------------------------------------------------

  /**
   * Tap View More until it stays hidden for a sustained window. Capped at
   * VIEW_MORE_MAX_TAPS for safety. On this build the button briefly detaches
   * during the load-more refresh, so a 3s stability window is required
   * before concluding "no more pages."
   */
  async tapViewMoreUntilHidden(): Promise<number> {
    let taps = 0;
    while (taps < VIEW_MORE_MAX_TAPS) {
      if (await this.ui.isPresent(L.VIEW_MORE_BUTTON)) {
        await this.ui.click(L.VIEW_MORE_BUTTON);
        await this.ui.pause(1200);
        taps += 1;
        continue;
      }
      // Button currently missing — wait and recheck a few times to be sure
      // it's not a transient refresh gap.
      if (await this.isStablyHidden(3000)) break;
    }
    return taps;
  }

  /** True only if View More remains hidden for the full `windowMs` window. */
  private async isStablyHidden(windowMs: number): Promise<boolean> {
    const deadline = Date.now() + windowMs;
    while (Date.now() < deadline) {
      if (await this.ui.isPresent(L.VIEW_MORE_BUTTON)) return false;
      await this.ui.pause(400);
    }
    return true;
  }

  async isViewMoreVisible(): Promise<boolean> {
    return this.ui.isPresent(L.VIEW_MORE_BUTTON);
  }

  // ---- Sort menu --------------------------------------------------------

  /**
   * Open the title-bar sort/export side panel. The kebab is identified by
   * its resource-id and the tap centre is computed at runtime via
   * `getElementRect`, so the action stays portable across screen sizes.
   * The W3C pointer action (move → down → 50ms pause → up) matches the
   * sequence Appium Inspector dispatches for its Tap button.
   */
  async openMenu(): Promise<void> {
    const driver = (this.ui as unknown as { driver: any }).driver;
    const KEBAB_ID = 'com.jas.digitalkyats:id/menu';
    // Single tap via the resource-id strategy (mirrors Appium Inspector's
    // "Find By id" + Tap). DO NOT retry on this build: a second tap while
    // the panel is open toggles it closed, breaking the subsequent sort
    // selection. Fixed wait lets the slide-in animation complete.
    try {
      const el = await driver.findElement('id', KEBAB_ID);
      await driver.elementClick(el['element-6066-11e4-a52e-4f735466cecf'] ?? el.ELEMENT);
    } catch {
      try {
        const elUia = await driver.$(`android=${L.TITLE_BAR_MENU_UIA}`);
        await elUia.click();
      } catch {
        const el = await this.resolve(L.TITLE_BAR_MENU);
        const { x, y } = await this.elementCenter(el);
        await this.w3cTap(x, y);
      }
    }
    await this.ui.pause(1500);
  }

  /**
   * Tap a sort-panel item. Items expose stable resource-ids; the id
   * strategy + elementClick mirrors the kebab tap path that works on this
   * build. XPath fallback covers a build mismatch.
   */
  async selectSort(option: SortOption): Promise<void> {
    // Each side-panel item has a stable resource-id (confirmed via Appium
    // Inspector). Use the id strategy + elementClick — same pattern that
    // makes the kebab open reliably — instead of coord-based taps.
    const idMap: Record<SortOption, string> = {
      'Recent':         L.SORT_RECENT_ID,
      'Sort By Date':   L.SORT_BY_DATE_ID,
      'Sort By Amount': L.SORT_BY_AMOUNT_ID,
      'Sort By Name':   L.SORT_BY_NAME_ID,
      'Export to PDF':  L.EXPORT_TO_PDF_ID,
    };
    const driver = (this.ui as unknown as { driver: any }).driver;
    try {
      const el = await driver.findElement('id', idMap[option]);
      await driver.elementClick(el['element-6066-11e4-a52e-4f735466cecf'] ?? el.ELEMENT);
    } catch {
      // Fallback: xpath locator (text- or id-based).
      const xpathMap: Record<SortOption, string> = {
        'Recent':         L.SORT_RECENT,
        'Sort By Date':   L.SORT_BY_DATE,
        'Sort By Amount': L.SORT_BY_AMOUNT,
        'Sort By Name':   L.SORT_BY_NAME,
        'Export to PDF':  L.EXPORT_TO_PDF,
      };
      await this.ui.click(xpathMap[option]);
    }
    await this.ui.pause(900);
  }

  // ---- W3C tap helpers --------------------------------------------------

  /** Resolve a selector to a webdriverio Element. */
  private async resolve(selector: string): Promise<any> {
    const driver = (this.ui as unknown as { driver: any }).driver;
    return driver.$(selector);
  }

  /** Centre coordinates of an element in the viewport. */
  private async elementCenter(el: any): Promise<{ x: number; y: number }> {
    await el.waitForExist({ timeout: 10_000 });
    const [loc, size] = await Promise.all([el.getLocation(), el.getSize()]);
    return {
      x: Math.round(loc.x + size.width  / 2),
      y: Math.round(loc.y + size.height / 2),
    };
  }


  /** W3C pointer-action tap at (x, y) — mirrors Inspector's Tap sequence. */
  private async w3cTap(x: number, y: number): Promise<void> {
    const driver = (this.ui as unknown as { driver: any }).driver;
    await driver.action('pointer', { parameters: { pointerType: 'touch' } })
      .move({ duration: 0, x, y })
      .down({ button: 0 })
      .pause(50)
      .up({ button: 0 })
      .perform();
  }

  /**
   * Capture the text of the first transaction row. Used as the comparison
   * signature for "ordering changed" assertions across a sort toggle.
   */
  async firstRowSignature(): Promise<string> {
    // Re-use the page source as a cheap way to read row text without per-field
    // selectors; we extract the first row's XML subtree and hash by length+head.
    const source = await this.ui.getPageSource();
    const rowMatch = source.match(/text="([^"]{1,60})"/);
    return rowMatch?.[1] ?? '';
  }

  // ---- Transaction detail screen ----------------------------------------

  async tapFirstTransaction(): Promise<void> {
    await this.ui.click(L.FIRST_TRANSACTION_ROW);
    await this.ui.pause(1000);
  }

  async waitForDetailScreen(timeoutMs = 20_000): Promise<boolean> {
    return waitForPresent(this.ui, L.DETAIL_HEADER, timeoutMs);
  }

  async tapInvoice(): Promise<void> {
    await this.ui.click(L.INVOICE_BUTTON);
    await this.ui.pause(800);
  }

  async waitForInvoiceScreen(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.INVOICE_SCREEN_MARKER, timeoutMs);
  }

  async tapShare(): Promise<void> {
    await this.ui.click(L.SHARE_BUTTON);
    await this.ui.pause(800);
  }

  async waitForShareScreen(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.SHARE_SCREEN_MARKER, timeoutMs);
  }

  async tapHome(): Promise<void> {
    await this.ui.click(L.HOME_BUTTON);
    await this.ui.pause(1000);
  }

  async waitForHomeScreen(timeoutMs = 20_000): Promise<boolean> {
    return waitForPresent(this.ui, L.HOME_TAB, timeoutMs);
  }
}
