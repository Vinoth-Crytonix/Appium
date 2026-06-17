/**
 * RequestMoneyPage â€” drives the Request Money flow, including the manual
 * gallery-attachment step the AUT cannot be driven through programmatically.
 *
 * Re-uses the injected {@link LoginPage} for the in-between authorization;
 * login is credentials only, never payment.
 */

import { BasePage, type PageContext } from './basePage';
import type { LoginPage } from './loginPage';
import { REQUEST_MONEY_LOCATORS as L } from '../locators/requestMoney.locators';
import { scrollIntoView, backNavigateUntil } from '../support/navigation';
import { randomInt } from '../support/random';

export class RequestMoneyPage extends BasePage {
  protected readonly dumpPrefix = 'req';

  constructor(ctx: PageContext, private readonly login: LoginPage) {
    super(ctx);
  }

  async tapRequestMoneyTile(): Promise<void> {
    await this.ui.click(L.REQUEST_MONEY_TILE);
    await this.ui.pause(700);
    await this.dump('after-tile');
  }

  async tapEnterMobileOption(): Promise<void> {
    await this.ui.click(L.ENTER_MOBILE_OPTION);
    await this.ui.pause(700);
    await this.dump('after-mobile-option');
  }

  /**
   * Fill and submit a Request Money for `number`, attaching a gallery image.
   * The gallery attachment is a MANUAL step â€” see the inline note.
   */
  async submitRequestMoney(number: string): Promise<void> {
    // 1. Mobile number â€” custom on-screen keypad; inject via Android keycodes.
    //    The Enter Mobile Number field is pre-filled with "09", so strip a
    //    leading "09" from the data value before typing — otherwise typing
    //    "09664433118" produces "0909664433118".
    const digitsToType = number.startsWith('09') ? number.slice(2) : number;
    await this.ui.typeDigits(L.MOBILE_FIELD, digitsToType);
    await this.ui.pause(800);

    // 2. Dismiss the custom keypad (not a real IME â€” back-press dismisses it).
    await this.ui.back();
    await this.ui.pause(700);
    await this.dump('after-mobile-keypad-dismissed');

    // 3. Open "Select Request For" and pick "OK $ Money".
    await this.ui.click(L.REQUEST_FOR_DROPDOWN);
    await this.ui.pause(800);
    await this.dump('request-for-open');
    await this.ui.click(L.OK_MONEY_OPTION);

    // Wait for the amount field to render (a brief loader follows selection).
    await this.ui.waitForDisplayed(L.AMOUNT_FIELD, 30_000);
    await this.dump('after-ok-money');

    // 4. Amount â€” random 10â€“999. Custom keypad again.
    const amount = String(randomInt(10, 1000));
    await this.ui.typeDigits(L.AMOUNT_FIELD, amount);
    await this.ui.pause(800);
    console.log('   amount =', amount);

    await this.ui.back();
    await this.ui.pause(1000);
    await this.dump('after-amount-entered');

    // 5. Remarks â€” standard Android keyboard.
    await this.ui.sendKeys(L.REMARKS_FIELD, 'Test Appium');
    await this.ui.hideKeyboard();
    await this.ui.pause(500);
    await this.dump('after-remarks');

    // 6. Attach File â†’ Gallery â†’ image. Fully MANUAL on this build because the
    //    Attach File widget does not respond to programmatic taps (clickGesture
    //    by element-id and coordinate, .click(), longClickGesture, and W3C
    //    pointer down/up have all been tried).
    console.log('');
    console.log('   â¸  MANUAL STEP â€” on the device:');
    console.log('       1. Tap "Attach File"');
    console.log('       2. Tap Gallery in the chooser');
    console.log('       3. Pick an image (tap it / tap Done to confirm)');
    console.log('     The test resumes the moment the Request Money form is back.');

    await this.waitForFormBack(5 * 60_000);
    console.log('   âœ“ Back on the Request Money form â€” continuing.');
    await this.ui.pause(700);

    // 7. Request Now radio.
    await scrollIntoView(this.ui, L.REQUEST_NOW_RADIO);
    await this.dump('before-radio');
    await scrollIntoView(this.ui, L.REQUEST_NOW_RADIO);
    await this.ui.click(L.REQUEST_NOW_RADIO);
    await this.ui.pause(500);
    await this.dump('before-submit');

    // 8. Submit â†’ confirmation popup â†’ OK.
    await this.ui.click(L.SUBMIT_BUTTON);
    await this.ui.pause(800);
    await this.dump('after-submit-popup');
    await this.ui.waitForDisplayed(L.OK_BUTTON, 20_000);
    await this.ui.click(L.OK_BUTTON);
    await this.ui.pause(1000);

    // 9. Authorize if the login screen appeared.
    if (await this.login.isPrompted()) {
      await this.login.performLogin();
    }
  }

  async confirmSuccessPopup(): Promise<void> {
    await this.ui.waitForDisplayed(L.OK_BUTTON, 30_000);
    await this.ui.click(L.OK_BUTTON);
    await this.ui.pause(800);
    await this.dump('after-success-ok');
  }

  /** Press Back until home; returns whether we landed on the home screen. */
  async returnHomeViaBack(): Promise<boolean> {
    await backNavigateUntil(this.ui, L.HOME_TAB, 6);
    return this.ui.isPresent(L.HOME_TAB);
  }

  // ----- internals -------------------------------------------------------

  /**
   * Wait for the AUT's "form is back" signal after the manual gallery step â€”
   * the image-attached markers, the Request Now radio, or the Submit button.
   */
  private async waitForFormBack(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.ui.isPresent(L.BACK_ON_FORM_MARKER)) return;
      await this.ui.pause(1000);
    }
    await this.dump('attach-timeout');
    throw new Error(
      `Timed out (${timeoutMs / 1000}s) waiting for an image to be attached. ` +
      `See target/req-attach-timeout.xml.`,
    );
  }
}
