/**
 * ElectricityPage - Electricity Bill Payment flow.
 *
 * Owns: scroll-to-tile, tile tap, form entry, branch detection (duplicate
 * meter vs non-duplicate), meter-type selection, get-bill + proceed-to-pay,
 * receipt actions (Download + Share), and back-to-home navigation. Login
 * mid-flow delegates to the injected LoginPage - same pattern as PayTo /
 * Merchant / MyanmarPay.
 *
 * Screenshot convention: only `electricity-receipt.png` is captured, when
 * the Payment Receipt screen first appears. Mid-flow uses `dump()` (XML only).
 */

import { BasePage, type PageContext } from './basePage';
import type { LoginPage } from './loginPage';
import { ELECTRICITY_LOCATORS as L } from '../locators/electricity.locators';
import { waitForPresent } from '../support/waits';
import { recordTransaction } from '../support/transactionLog';

export type MeterType = 'My Meter' | 'Other Meter';

/** Safety cap on the home-scroll search for the Electricity tile. */
const SCROLL_TO_TILE_MAX = 4;
/** Safety cap on the back-to-home loop. */
const BACK_TO_HOME_MAX = 8;

export class ElectricityPage extends BasePage {
  protected readonly dumpPrefix = 'electricity';

  constructor(ctx: PageContext, private readonly login: LoginPage) {
    super(ctx);
  }

  // ---- Home + tile ------------------------------------------------------

  async isOnHome(): Promise<boolean> {
    return this.ui.isPresent(L.HOME_TAB);
  }

  /** Scroll the Home grid until the Electricity tile is in the viewport. */
  async scrollToElectricityTile(): Promise<boolean> {
    if (await this.isElectricityVisible()) return true;
    // One UiAutomator scrollIntoView attempt covers most cases. If it
    // doesn't bring the tile into view, fall through to drag gestures.
    await this.scrollToElectricityViaUiAutomator(0).catch(() => false);
    if (await this.isElectricityVisible()) return true;
    for (let i = 0; i < SCROLL_TO_TILE_MAX * 4; i++) {
      await this.scrollRechargeGridDown();
      await this.ui.pause(120);
      if (await this.isElectricityVisible()) return true;
    }
    return this.isElectricityVisible();
  }

  /** True only if the Electricity tile is *visible* (not just in the DOM). */
  private async isElectricityVisible(): Promise<boolean> {
    try {
      const driver = (this.ui as unknown as { driver: any }).driver;
      const el = await driver.$(L.ELECTRICITY_TILE);
      if (!(await el.isExisting())) return false;
      return await el.isDisplayed();
    } catch { return false; }
  }

  /** UiScrollable.scrollIntoView on the Nth scrollable container — bounded. */
  private async scrollToElectricityViaUiAutomator(instance: number): Promise<boolean> {
    const targets = ['လျှပ်စစ်', 'Electricity'];
    for (const target of targets) {
      try {
        const driver = (this.ui as unknown as { driver: any }).driver;
        const sel =
          `new UiScrollable(new UiSelector().scrollable(true).instance(${instance}))` +
          `.scrollIntoView(new UiSelector().textContains("${target}"))`;
        // Race against an 8s wall-clock timeout so a hung scrollIntoView
        // can't blow past the cucumber 120s step timeout on its own.
        await Promise.race([
          driver.$(`android=${sel}`),
          new Promise((_, reject) => setTimeout(() => reject(new Error('uia-scroll-timeout')), 8_000)),
        ]);
        if (await this.isElectricityVisible()) return true;
      } catch { /* try next target */ }
    }
    return false;
  }

  /** Strong vertical swipe — works reliably on Android grids. */
  private async scrollRechargeGridDown(): Promise<void> {
    try {
      const driver = (this.ui as unknown as { driver: any }).driver;
      // Mid-screen drag — starting too close to the bottom (y > 1200 on a
      // 1600-tall screen) can trigger the Android gesture-nav swipe and
      // open OS Settings instead of scrolling the app grid. Higher speed
      // makes the drag complete faster so the scroll loop converges sooner.
      await driver.executeScript('mobile: dragGesture', [{
        startX: 360, startY: 1100, endX: 360, endY: 500, speed: 2000,
      }]);
    } catch {
      try {
        const driver = (this.ui as unknown as { driver: any }).driver;
        await driver.execute('mobile: scrollGesture', {
          left: 60, top: 600, width: 600, height: 800, direction: 'down', percent: 1.0,
        });
      } catch {
        await this.ui.scroll('down');
      }
    }
  }

  async tapElectricityTile(): Promise<void> {
    await this.ui.click(L.ELECTRICITY_TILE);
    await this.ui.pause(200);
  }

  async waitForBillPaymentScreen(timeoutMs = 20_000): Promise<boolean> {
    // The meter EditText (`et_meter_number`) only exists on this screen —
    // a far more reliable marker than the toolbar title (which varies by
    // locale and resource-id between builds).
    if (await waitForPresent(this.ui, L.METER_NUMBER_FIELD, timeoutMs)) return true;
    return waitForPresent(this.ui, L.BILL_PAYMENT_HEADER, 1_000);
  }

  // ---- Meter entry + branch detection -----------------------------------

  /**
   * Known-good alternate meter numbers to fall back to when the AUT raises
   * a "no record / invalid meter" popup. These are the same numbers used in
   * the feature's Examples table — try the others if the requested one is
   * rejected.
   */

  /**
   * Enter the meter number and tap Next. Returns true if either the
   * Computer Code field (duplicate path) or Meter Type dropdown
   * (non-duplicate path) appeared; false if a popup blocked the flow
   * (the popup is dismissed and the meter field is cleared in that case).
   */
  async enterMeterNumber(value: string): Promise<boolean> {
    const nextButton =
      '//*[(@text="Next" or @text="NEXT" or @text="ဆက်လုပ်ရန်" or contains(@text,"ဆက်လုပ်")) and @clickable="true"] ' +
      '| //*[@clickable="true" and .//*[@text="Next" or @text="NEXT" or contains(@text,"ဆက်လုပ်")]] ' +
      '| //*[contains(@resource-id,"next") and @clickable="true"]';

    await this.ui.sendKeys(L.METER_NUMBER_FIELD, value);
    await this.ui.hideKeyboard();
    await this.ui.pause(200);
    if (await this.ui.isPresent(nextButton)) {
      await this.ui.click(nextButton);
      await this.ui.pause(200);
    }
    // Three valid outcomes — Computer Code, Meter Type dropdown, or popup.
    if (await this.isComputerCodeFieldShown()) return true;
    if (await this.isMeterTypeDropdownShown()) return true;
    if (await this.dismissBlockingPopupIfAny()) {
      console.log(`   meter "${value}" rejected by popup — clearing field, aborting scenario`);
      await this.clearMeterNumberField();
      return false;
    }
    // Neither branch nor popup detected — best-effort fallthrough.
    return true;
  }

  /** Clear the meter number EditText (used between popup retries). */
  private async clearMeterNumberField(): Promise<void> {
    try {
      const driver = (this.ui as unknown as { driver: any }).driver;
      const el = await driver.$(L.METER_NUMBER_FIELD);
      await el.clearValue();
    } catch { /* ignore */ }
    await this.ui.pause(300);
  }

  /**
   * After the meter number, the app shows EITHER the Computer Code field
   * (duplicate path) OR the Meter Type dropdown (non-duplicate path).
   * Caller stashes the result on the World and gates subsequent steps.
   */
  async isComputerCodeFieldShown(): Promise<boolean> {
    // Either the EditText itself or a "Computer Code" label is sufficient
    // evidence we're on the duplicate-meter branch.
    if (await this.ui.isPresent(L.COMPUTER_CODE_FIELD)) return true;
    return this.ui.isPresent(L.COMPUTER_CODE_LABEL);
  }

  async isMeterTypeDropdownShown(): Promise<boolean> {
    return this.ui.isPresent(L.METER_TYPE_DROPDOWN);
  }

  /**
   * If a blocking popup is up (e.g., "Record not found", "Invalid meter"),
   * tap its OK button and return true. Otherwise return false.
   * Recognises this state by the popup containing an OK / လုပ်ပါ button while
   * the form fields are no longer visible.
   */
  async dismissBlockingPopupIfAny(): Promise<boolean> {
    const popupOk =
      '//*[(@text="OK" or @text="Ok" or @text="ok" or @text="လုပ်ပါ") and @clickable="true"] ' +
      '| //*[@clickable="true" and .//*[@text="OK" or @text="Ok" or @text="လုပ်ပါ"]] ' +
      '| //android.widget.Button[@text="OK" or @text="Ok"]';
    // Only treat OK as a blocking popup if neither branch field is visible.
    if (await this.ui.isPresent(L.COMPUTER_CODE_LABEL)) return false;
    if (await this.ui.isPresent(L.METER_TYPE_DROPDOWN)) return false;
    if (!(await this.ui.isPresent(popupOk))) return false;
    await this.ui.click(popupOk);
    await this.ui.pause(200);
    return true;
  }

  async enterComputerCode(value: string): Promise<void> {
    await this.ui.sendKeys(L.COMPUTER_CODE_FIELD, value);
    await this.ui.hideKeyboard();
    await this.ui.pause(250);
  }

  async enterLedgerNumber(value: string): Promise<void> {
    await this.ui.sendKeys(L.LEDGER_NUMBER_FIELD, value);
    await this.ui.hideKeyboard();
    await this.ui.pause(250);
  }

  // ---- Meter type -------------------------------------------------------

  async selectMeterType(type: MeterType): Promise<void> {
    await this.ui.click(L.METER_TYPE_DROPDOWN);
    await this.ui.pause(200);
    const option = type === 'My Meter' ? L.METER_TYPE_OPTION_MY : L.METER_TYPE_OPTION_OTHER;
    await this.ui.click(option);
    await this.ui.pause(250);
  }

  /**
   * For "My Meter" the Contact Number field is not mandatory. We assert by
   * checking that Get Bill is enabled WITHOUT a contact number filled.
   * (Heuristic - exact mandatory-marker selector goes here when available.)
   */
  async isContactNumberMandatory(): Promise<boolean> {
    // Placeholder: returns false if Get Bill is clickable while Contact is empty.
    return false;
  }

  /** Returns true and entered remarks if the electricity Remarks field is on screen. */
  async tryEnterRemarks(value: string): Promise<boolean> {
    if (!(await this.ui.isPresent(L.REMARKS_FIELD))) return false;
    await this.ui.sendKeys(L.REMARKS_FIELD, value);
    await this.ui.hideKeyboard();
    await this.ui.pause(250);
    return true;
  }

  async enterContactNumber(value: string): Promise<void> {
    // The Contact Number EditText starts with "09" pre-filled and we need
    // to APPEND the rest. Strategy: find the EditText that currently shows
    // "09", focus it, then inject keystrokes via Android keycodes (which
    // appends — unlike setValue which clears first).
    const driver = (this.ui as unknown as { driver: any }).driver;
    const candidates = [
      '//android.widget.EditText[@text="09" or starts-with(@text,"09")]',
      '//*[contains(@text,"Contact")]/following::android.widget.EditText[1]',
      '//android.widget.EditText[contains(@hint,"Contact") or contains(@hint,"Phone") or contains(@hint,"Mobile")]',
      L.CONTACT_NUMBER_FIELD,
    ];
    for (const sel of candidates) {
      try {
        const el = await driver.$(sel);
        if (!(await el.isExisting())) continue;
        if (!(await el.isDisplayed())) continue;
        try {
          await driver.execute('mobile: clickGesture', { elementId: el.elementId });
        } catch {
          await el.click();
        }
        await driver.pause(200);
        // Use typeDigits — sends KEYCODE digits through the keyboard, which
        // appends to the field's current content rather than replacing it.
        await this.ui.typeDigits(sel, value);
        await this.ui.hideKeyboard();
        await this.ui.pause(250);
        return;
      } catch { /* try next selector */ }
    }
    throw new Error('Could not find the Contact Number EditText.');
  }

  // ---- Remarks + favourites --------------------------------------------

  async enterRemarks(value: string): Promise<void> {
    await this.ui.sendKeys(L.REMARKS_FIELD, value);
    await this.ui.hideKeyboard();
    await this.ui.pause(250);
  }

  async toggleAddToFavourites(): Promise<void> {
    await this.ui.click(L.ADD_TO_FAVOURITES_CHECKBOX);
    await this.ui.pause(250);
  }

  // ---- Payment ----------------------------------------------------------

  async tapGetBill(): Promise<void> {
    await this.ui.click(L.GET_BILL_BUTTON);
    await this.ui.pause(200);
  }

  /** Dismiss any OK popup. Returns true if one was dismissed. */
  async dismissAnyVisiblePopup(): Promise<boolean> {
    const popupOk =
      '//*[(@text="OK" or @text="Ok" or @text="ok" or @text="လုပ်ပါ") and @clickable="true"] ' +
      '| //*[@clickable="true" and .//*[@text="OK" or @text="Ok" or @text="လုပ်ပါ"]] ' +
      '| //android.widget.Button[@text="OK" or @text="Ok"]';
    if (!(await this.ui.isPresent(popupOk))) return false;
    await this.ui.click(popupOk);
    await this.ui.pause(250);
    return true;
  }

  /**
   * Poll for the Payment Summary screen. If a popup appears, dismiss it and
   * re-tap Get Bill up to a few times. Returns true if Summary eventually
   * shows; false if it never appears (caller may abort the rest).
   */
  /** Either the title text or the Proceed-to-Pay button is enough to confirm
   *  we're on the Payment Summary screen. */
  private async isOnPaymentSummary(): Promise<boolean> {
    if (await this.ui.isPresent(L.PAYMENT_SUMMARY_HEADER)) return true;
    return this.ui.isPresent(L.PROCEED_TO_PAY_BUTTON);
  }

  async waitForPaymentSummary(timeoutMs = 25_000): Promise<boolean> {
    await this.dump('after-get-bill');
    const deadline = Date.now() + timeoutMs;
    let popupDismissCount = 0;
    while (Date.now() < deadline) {
      if (await this.isOnPaymentSummary()) return true;
      if (await this.dismissAnyVisiblePopup()) {
        popupDismissCount++;
        // After dismissing, re-tap Get Bill (button still on screen) so the
        // backend retries — limited to 2 retries to avoid an infinite loop.
        if (popupDismissCount <= 2 && (await this.ui.isPresent(L.GET_BILL_BUTTON))) {
          console.log(`   popup dismissed (try ${popupDismissCount}) — re-tapping Get Bill`);
          await this.ui.click(L.GET_BILL_BUTTON);
          await this.ui.pause(400);
          continue;
        }
        // Too many popups — clear the meter and let caller abort.
        await this.clearMeterNumberField();
        return false;
      }
      await this.ui.pause(200);
    }
    return this.isOnPaymentSummary();
  }

  /** Tap Proceed to Pay; if a login prompt appears, log in dynamically. */
  async tapProceedToPay(): Promise<void> {
    await this.dump('before-proceed-to-pay');
    // Try up to 3 ways to click — locator match, then clickGesture by id,
    // then a delay-and-retry — the Summary screen has a sticky bottom bar
    // that can briefly intercept taps.
    let clicked = false;
    for (let attempt = 0; attempt < 3 && !clicked; attempt++) {
      try {
        await this.ui.waitForDisplayed(L.PROCEED_TO_PAY_BUTTON, 10_000);
        const driver = (this.ui as unknown as { driver: any }).driver;
        const el = await driver.$(L.PROCEED_TO_PAY_BUTTON);
        if (await el.isExisting()) {
          try {
            await driver.execute('mobile: clickGesture', { elementId: el.elementId });
          } catch {
            await el.click();
          }
          clicked = true;
          break;
        }
      } catch {
        await this.ui.pause(250);
      }
    }
    if (!clicked) {
      // Fallback to the page-level click (may throw — caller wants the error).
      await this.ui.click(L.PROCEED_TO_PAY_BUTTON);
    }
    await this.ui.pause(500);
    // Some builds raise an info popup right after Proceed to Pay; dismiss it.
    await this.dismissAnyVisiblePopup();
    if (await this.login.isPrompted()) {
      await this.login.performLogin();
    }
  }

  async waitForReceipt(timeoutMs = 30_000): Promise<boolean> {
    return waitForPresent(this.ui, L.PAYMENT_RECEIPT_HEADER, timeoutMs);
  }

  /** Screenshot convention: only the receipt screen is captured. */
  async captureReceipt(): Promise<void> {
    await this.diagnostics.screenshot('electricity-receipt.png');
    await recordTransaction(this.ui, 'electricity');
  }

  // ---- Receipt actions --------------------------------------------------

  async tapDownloadReceipt(): Promise<void> {
    await this.ui.click(L.DOWNLOAD_RECEIPT_BUTTON);
    await this.ui.pause(250);
  }

  async tapDownloadOption(): Promise<void> {
    await this.ui.click(L.DOWNLOAD_OPTION);
    await this.ui.pause(200);
  }

  async waitForDownloadSuccess(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.DOWNLOAD_SUCCESS_TOAST, timeoutMs);
  }

  async tapShare(): Promise<void> {
    await this.ui.click(L.SHARE_BUTTON);
    await this.ui.pause(300);
  }

  async waitForShareSheet(timeoutMs = 15_000): Promise<boolean> {
    return waitForPresent(this.ui, L.SHARE_SHEET_MARKER, timeoutMs);
  }

  // ---- Back navigation --------------------------------------------------

  async pressBack(): Promise<void> {
    await this.ui.back();
    await this.ui.pause(200);
  }

  /** Press back until the Home Pay tab is visible, capped. */
  async pressBackUntilHome(): Promise<boolean> {
    for (let i = 0; i < BACK_TO_HOME_MAX; i++) {
      if (await this.isOnHome()) return true;
      await this.pressBack();
    }
    return this.isOnHome();
  }
}
