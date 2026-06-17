/**
 * MyanmarPayPersonalPage - drives the Myanmar Pay Personal flow.
 *
 * Owns: home-tile entry, scanner UI (torch + upload QR), the manual gallery
 * pick (long wait for the human), the wrong-QR retry loop, the payment form
 * and the receipt screen. Login is delegated to the injected LoginPage when
 * Confirm Payment triggers a re-auth - same pattern as PayTo / Merchant.
 *
 * Screenshot convention: only the receipt is captured (`myanmarPayPersonal-receipt.png`).
 * Mid-flow diagnostics use `dump()` (XML only).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { BasePage, type PageContext } from './basePage';
import type { LoginPage } from './loginPage';
import { MYANMAR_PAY_PERSONAL_LOCATORS as L } from '../locators/myanmarPayPersonal.locators';
import { waitForPresent } from '../support/waits';
import { randomAmount } from '../support/random';
import { recordTransaction } from '../support/transactionLog';

/** Time we give the human to pick an image from the system gallery. */
const MANUAL_PICK_TIMEOUT_MS = 60_000;
/** Poll interval while waiting for the manual pick to resolve. */
const MANUAL_PICK_POLL_MS = 1_500;

export class MyanmarPayPersonalPage extends BasePage {
  protected readonly dumpPrefix = 'myanmarPayPersonal';

  constructor(ctx: PageContext, private readonly login: LoginPage) {
    super(ctx);
  }

  // ---- Entry + scanner --------------------------------------------------

  async tapMyanmarPayTile(): Promise<void> {
    await this.scrollToMyanmarPayTile();
    await this.ui.click(L.MYANMAR_PAY_TILE);
    await this.ui.pause(700);
  }

  /** Scroll the Home grid until the Myanmar Pay tile becomes visible. */
  private async scrollToMyanmarPayTile(): Promise<boolean> {
    if (await this.ui.isPresent(L.MYANMAR_PAY_TILE)) return true;
    // The icon-only tile has no text label, so UiScrollable text matching
    // can't find it. Fall back to repeated drag gestures over the home grid.
    const driver = (this.ui as unknown as { driver: any }).driver;
    for (let i = 0; i < 6; i++) {
      try {
        await driver.executeScript('mobile: dragGesture', [{
          startX: 360, startY: 1300, endX: 360, endY: 400, speed: 2000,
        }]);
      } catch { /* ignore — fall through to presence check */ }
      await this.ui.pause(400);
      if (await this.ui.isPresent(L.MYANMAR_PAY_TILE)) return true;
    }
    return false;
  }

  /** True if the scanner screen is shown (subscriber path). */
  async isScannerShown(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.SCANNER_HEADER, timeoutMs);
  }

  /**
   * UI validation on the scanner screen - asserts the elements the user
   * expects to see (header, viewfinder, torch, upload QR).
   */
  async validateScannerUi(): Promise<{ header: boolean; torch: boolean; uploadQr: boolean }> {
    return {
      header:   await this.ui.isPresent(L.SCANNER_HEADER),
      torch:    await this.ui.isPresent(L.TORCH_ICON),
      uploadQr: await this.ui.isPresent(L.UPLOAD_QR_BUTTON),
    };
  }

  /** Tap the torch icon - same selector toggles on and off. */
  async toggleTorch(): Promise<void> {
    await this.ui.click(L.TORCH_ICON);
    await this.ui.pause(1000);
  }

  // ---- Upload QR + manual gallery pick ----------------------------------

  async tapUploadQr(): Promise<void> {
    await this.ui.click(L.UPLOAD_QR_BUTTON);
    await this.ui.pause(800);
  }

  /**
   * Block until the user has picked an image from the system gallery, then
   * resolve to one of three outcomes:
   *   - 'payment'  -> payment screen visible (valid QR)
   *   - 'wrong'    -> wrong-QR popup visible (invalid QR)
   *   - 'timeout'  -> no resolution within MANUAL_PICK_TIMEOUT_MS
   *
   * The poll is intentionally cheap - just two `isPresent` checks - because
   * the gallery is a system Activity outside the AUT and the only signal we
   * get is the AUT resuming.
   */
  async waitForGalleryPickResolution(): Promise<'payment' | 'wrong' | 'timeout'> {
    const driver = (this.ui as unknown as { driver: any }).driver;
    const AUT_PKG = 'com.jas.digitalkyats';
    const deadline = Date.now() + MANUAL_PICK_TIMEOUT_MS;
    while (Date.now() < deadline) {
      // While the system gallery/photo-picker is foreground, keep waiting.
      let pkg = '';
      try { pkg = await driver.getCurrentPackage(); } catch { /* ignore */ }
      if (pkg && pkg !== AUT_PKG) {
        await this.ui.pause(MANUAL_PICK_POLL_MS);
        continue;
      }
      if (await this.ui.isPresent(L.PAYMENT_SCREEN_HEADER)) return 'payment';
      if (await this.ui.isPresent(L.WRONG_QR_POPUP)) return 'wrong';
      // Back in the AUT but scanner gone: treat as forward progress; the
      // next step's stronger payment-screen assertion will catch surprises.
      if (!(await this.ui.isPresent(L.SCANNER_HEADER))) return 'payment';
      await this.ui.pause(MANUAL_PICK_POLL_MS);
    }
    return 'timeout';
  }

  /** Dismiss the wrong-QR popup so Upload QR is tappable again. */
  async dismissWrongQrPopup(): Promise<void> {
    if (await this.ui.isPresent(L.WRONG_QR_OK_BUTTON)) {
      await this.ui.click(L.WRONG_QR_OK_BUTTON);
      await this.ui.pause(800);
    }
  }

  // ---- Payment form -----------------------------------------------------

  async waitForPaymentScreen(timeoutMs = 30_000): Promise<boolean> {
    return waitForPresent(this.ui, L.PAYMENT_SCREEN_HEADER, timeoutMs);
  }

  async enterAmount(amount: string): Promise<void> {
    await this.ui.sendKeys(L.AMOUNT_FIELD, amount);
    await this.ui.pause(400);
  }

  /** Enter a random amount with at most 3 digits, per the feature spec. */
  async enterRandomAmount(): Promise<void> {
    await this.enterAmount(randomAmount(3));
  }

  async enterRemarks(remarks: string): Promise<void> {
    await this.ui.sendKeys(L.REMARKS_FIELD, remarks);
    await this.ui.hideKeyboard();
    await this.ui.pause(500);
  }

  /** Tap Confirm Payment, then handle the optional re-auth prompt. */
  async tapConfirmPayment(): Promise<void> {
    await this.ui.click(L.CONFIRM_PAYMENT_BUTTON);
    await this.ui.pause(800);
    if (await this.login.isPrompted()) {
      await this.login.performLogin();
    }
  }

  // ---- Receipt ----------------------------------------------------------

  async waitForReceipt(timeoutMs = 30_000): Promise<boolean> {
    return waitForPresent(this.ui, L.RECEIPT_MARKER, timeoutMs);
  }

  /** Screenshot convention: only the receipt screen is captured. */
  async captureReceipt(): Promise<void> {
    await this.diagnostics.screenshot('myanmarPayPersonal-receipt.png');
    await recordTransaction(this.ui, 'myanmarPayPersonal');
  }

  /**
   * Extract receipt details from the current page source and append a
   * structured record to `target/myanmar-pay-payments.log`. The log is a
   * simple text file (one record per payment, separated by a blank line)
   * so it's easy to grep across runs.
   */
  async recordPaymentDetails(): Promise<void> {
    const source = await this.ui.getPageSource();
    const allTexts = Array.from(source.matchAll(/text="([^"]+)"/g))
      .map(m => m[1].trim())
      .filter(t => t.length > 0);
    const find = (regex: RegExp) => allTexts.find(t => regex.test(t)) ?? '';
    const fields = {
      'Captured At':    new Date().toISOString(),
      'Amount':         find(/\d+(?:[.,]\d+)?\s*MMK/i),
      'Account Name':   find(/^(?:Mr|Mrs|Ms|Mister|Daw|U)\b/i),
      'Account Number': find(/^(?:09\d{8,}|\d{11})$/),
      'Merchant Name':  find(/Merchant|Store|Shop|Ninjavan/i),
      'Merchant ID':    find(/^2\d{14}$/),
      'Transaction ID': find(/^\d{20,}$/),
      'Date & Time':    find(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/i),
      'Status':         find(/Successful|Success|Transaction Successful|ပြီးမြောက်|အောင်မြင်/i),
    };
    const lines = Object.entries(fields)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => `${k}: ${v}`);
    const record = ['---', ...lines, ''].join('\n');
    const logPath = path.resolve('target', 'myanmar-pay-payments.log');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, record, { encoding: 'utf8' });
  }

  async tapInvoice(): Promise<void> {
    await this.ui.click(L.INVOICE_BUTTON);
    await this.ui.pause(800);
  }

  async tapShare(): Promise<void> {
    await this.ui.click(L.SHARE_BUTTON);
    await this.ui.pause(800);
  }

  async pressBack(): Promise<void> {
    await this.ui.back();
    await this.ui.pause(800);
  }
}
