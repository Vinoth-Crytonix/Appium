/**
 * Request Money step definitions. Mirrors the PayTo flat-step-defs design —
 * locators inline, no Page Objects. Re-uses performLogin() from Login.steps
 * for the in-between authorization (login = credentials only, never payment).
 *
 * Locators are best-effort: text-based (English + Burmese) and
 * resource-id contains patterns. After the first run, refine using the
 * dumps in target/req-*.xml.
 */

import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { TestWorld } from '../support/world';
import { LOGIN, performLogin } from './Login.steps';

// ---------------------------------------------------------------------------
// Locators
// ---------------------------------------------------------------------------

const REQ = {
  // Home tile
  REQUEST_MONEY_TILE:
    '//android.widget.TextView[@text="Request Money" or @text="ငွေတောင်းခံခြင်း"] ' +
    '| //*[contains(@content-desc,"Request Money") or contains(@content-desc,"ငွေတောင်း")]',

  // Option screen after tapping the tile (Enter Mobile Number / Scan QR / ...)
  ENTER_MOBILE_OPTION:
    '//*[@text="Enter Mobile Number" or @text="ဖုန်းနံပါတ်ဖြင့်" ' +
    'or contains(@text,"Mobile Number") or contains(@text,"ဖုန်းနံပါတ်")] ' +
    '| //*[contains(@content-desc,"Mobile Number") or contains(@content-desc,"ဖုန်းနံပါတ်")]',

  // Mobile number field on the Request Money form (hint: "Enter Request Money Number")
  MOBILE_FIELD: '//*[@resource-id="com.jas.digitalkyats:id/clearable_editText"]',

  // "Select Request For" dropdown — actually labelled "select_deposit_by_layout"
  // in the AUT; this is the row the user taps to pick a request type.
  REQUEST_FOR_DROPDOWN:
    '//*[@resource-id="com.jas.digitalkyats:id/select_deposit_by_layout"]',
  OK_MONEY_OPTION:
    '//*[@text="OK $ Money" or @text="OK$ Money" or @text="OK Money" ' +
    'or @text="OK $ ပိုက်ဆံ" ' +              // Burmese
    'or contains(@text,"OK $ Money") or contains(@text,"OK $ ပိုက်ဆံ")]',

  // Amount + Remarks (real input fields after OK$ Money is selected).
  // NB: "amount" resource-id is the read-only label of an existing pending
  // request; the real input is "amount_new".
  AMOUNT_FIELD:
    '//*[@resource-id="com.jas.digitalkyats:id/amount_new"] ' +
    '| //android.widget.EditText[contains(@hint,"Enter Amount")]',
  REMARKS_FIELD:
    '//android.widget.EditText[@resource-id="com.jas.digitalkyats:id/remark"] ' +
    '| //android.widget.EditText[contains(@hint,"Enter Remarks") or contains(@hint,"Remark")]',

  // Attach file — the LinearLayout that opens the Gallery/Camera chooser.
  ATTACH_BUTTON:
    '//*[@resource-id="com.jas.digitalkyats:id/attachment2"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/attached_image"]',
  GALLERY_OPTION:
    '//*[@text="Gallery" or @text="ပုံများ" or @text="Photos" or @text="ဂယ်လာရီ" ' +
    'or @text="ပုံ" or @text="ဓာတ်ပုံ" or @text="ပုံ ပြခန်း" ' +
    'or contains(@text,"Gallery") or contains(@text,"ပုံ")] ' +
    '| //*[contains(@resource-id,"gallery")]',

  // Request Now radio — resource-id is language-independent; text fallbacks
  // for both English and Burmese.
  REQUEST_NOW_RADIO:
    '//*[@resource-id="com.jas.digitalkyats:id/radio_req"] ' +
    '| //android.widget.RadioButton[@text="Request Now" or contains(@text,"Request Now") ' +
    'or contains(@text,"ယခု") or contains(@text,"တောင်းခံ")]',

  // Submit — on the Request Money form this is "button1" with Burmese "ပေးပို့".
  SUBMIT_BUTTON:
    '//*[@resource-id="com.jas.digitalkyats:id/button1"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/new_send_money_submit_button"] ' +
    '| //android.widget.Button[@text="Submit" or @text="SUBMIT" or @text="ပေးပို့" or @text="တင်ပေးရန်"] ' +
    '| //*[(@text="Submit" or @text="SUBMIT" or @text="ပေးပို့") and @clickable="true"]',

  // OK / confirm button on popups. In Burmese the "Yes/OK" button is
  // "လုပ်ပါ" ("do it"); cancel is "မလုပ်ပါ" ("don't").
  OK_BUTTON:
    '//android.widget.Button[@text="OK" or @text="Ok" or @text="ok" ' +
    'or @text="ဟုတ်ကဲ့" or @text="လုပ်ပါ"] ' +
    '| //*[(@text="OK" or @text="Ok" or @text="လုပ်ပါ") and @clickable="true"]',

  // Home tab (used by back-to-home assertion)
  HOME_TAB: '//android.widget.TextView[@text="Pay" or @text="ငွေပေး"]',
};

// ---------------------------------------------------------------------------
// Diagnostic helpers
// ---------------------------------------------------------------------------

async function dump(world: TestWorld, name: string): Promise<void> {
  try {
    fs.mkdirSync('target', { recursive: true });
    fs.writeFileSync(path.join('target', `req-${name}.xml`), await world.driver.getPageSource());
    await world.screenshotToTarget(`req-${name}.png`);
  } catch { /* ignore */ }
}

/**
 * Scroll the form (or whole screen) until the target element is displayed,
 * trying both down and up directions. WDIO's click can fail with
 * "not displayed" when the element exists in the page source but is off-
 * screen — this helper brings it into the visible viewport first.
 */
async function scrollIntoView(world: TestWorld, selector: string): Promise<void> {
  // First, quick check — if it's already visible, nothing to do.
  const el = await world.driver.$(selector);
  if (await el.isDisplayed().catch(() => false)) return;

  for (const direction of ['down', 'up'] as const) {
    for (let i = 0; i < 4; i++) {
      try {
        await world.driver.execute('mobile: scrollGesture', {
          left: 0, top: 200, width: 720, height: 1200,
          direction, percent: 0.6,
        });
      } catch { /* ignore */ }
      await world.driver.pause(600);
      const probe = await world.driver.$(selector);
      if (await probe.isDisplayed().catch(() => false)) return;
    }
  }
  // Fall through — let the caller's click attempt produce a proper error.
}

/**
 * Wait for the AUT's "image attached" signal — the delete_button / add
 * icons only appear in attach_container once an image is actually attached.
 * Used while the human at the device taps Attach File → Gallery → pick.
 */
async function waitForImageAttached(world: TestWorld, marker: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await world.isPresent(marker)) return;
    await world.driver.pause(1000);
  }
  await dump(world, 'attach-timeout');
  throw new Error(
    `Timed out (${timeoutMs / 1000}s) waiting for an image to be attached. ` +
    `See target/req-attach-timeout.xml.`,
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

When('I tap the Request Money tile', async function (this: TestWorld) {
  await this.click(REQ.REQUEST_MONEY_TILE);
  await this.pause(2500);
  await dump(this, 'after-tile');
});

When('I tap the Enter Mobile Number option', async function (this: TestWorld) {
  await this.click(REQ.ENTER_MOBILE_OPTION);
  await this.pause(2500);
  await dump(this, 'after-mobile-option');
});

When(
  'I submit a Request Money for {string} attaching a gallery image',
  // Allow up to 8 minutes — the gallery step pauses for manual image selection
  { timeout: 8 * 60_000 },
  async function (this: TestWorld, number: string) {
    // 1. Mobile number — uses a custom on-screen keypad that WDIO setValue
    //    cannot reach. Inject digits via Android keycodes.
    await this.typeDigits(REQ.MOBILE_FIELD, number);
    await this.pause(800);

    // 2. Dismiss the custom keypad so the rest of the form renders.
    //    The keypad isn't a real IME, so back-press is the reliable dismiss.
    await this.driver.back();
    await this.pause(2500);
    await dump(this, 'after-mobile-keypad-dismissed');

    // 3. Open "Select Request For" dropdown and pick "OK $ Money".
    await this.click(REQ.REQUEST_FOR_DROPDOWN);
    await this.pause(1500);
    await dump(this, 'request-for-open');
    await this.click(REQ.OK_MONEY_OPTION);

    // The app shows a brief loader after selection; wait for the amount field
    // to actually render before proceeding (fixed pauses were too short).
    const amountEl = await this.driver.$(REQ.AMOUNT_FIELD);
    await amountEl.waitForDisplayed({ timeout: 30_000 });
    await dump(this, 'after-ok-money');

    // 3. Amount — random up to 3 digits (10–999). Custom keypad again.
    const amount = String(10 + Math.floor(Math.random() * 990));
    await this.typeDigits(REQ.AMOUNT_FIELD, amount);
    await this.pause(800);
    console.log('   amount =', amount);

    // Dismiss the keypad so remarks / attach / submit render below.
    await this.driver.back();
    await this.pause(2000);
    await dump(this, 'after-amount-entered');

    // 4. Remarks — standard Android keyboard (alphabetic).
    await this.sendKeys(REQ.REMARKS_FIELD, 'Test Appium');
    await this.hideKeyboard();
    await this.pause(500);
    await dump(this, 'after-remarks');

    // 5. Attach File → Gallery → image. Fully MANUAL on this build because
    //    the Attach File widget does not respond to programmatic taps —
    //    we've tried clickGesture (element-id and coordinate), regular
    //    .click(), longClickGesture, and W3C pointer down/up.
    //
    //    The test pauses here and the human at the device:
    //      a) taps "Attach File"
    //      b) taps "Gallery" (or its Burmese equivalent)
    //      c) picks an image
    //    The test resumes when the form's "delete_button" or "add" element
    //    appears (the AUT's signal that an image was attached).
    console.log('');
    console.log('   ⏸  MANUAL STEP — on the device:');
    console.log('       1. Tap "Attach File"');
    console.log('       2. Tap Gallery in the chooser');
    console.log('       3. Pick an image (tap it / tap Done to confirm)');
    console.log('     The test resumes the moment the Request Money form is back.');

    // Resume as soon as the Request Money form is on screen again — detected
    // by ANY of: the image-attached markers (delete_button / add), the
    // Request Now radio, or the Submit button. Watching only delete_button/
    // add was too narrow and left the test stuck if the gallery returned
    // without those exact ids rendering.
    const backOnFormMarker =
      '//*[@resource-id="com.jas.digitalkyats:id/delete_button"] ' +
      '| //*[@resource-id="com.jas.digitalkyats:id/add"] ' +
      '| //*[@resource-id="com.jas.digitalkyats:id/radio_req"] ' +
      '| //*[@resource-id="com.jas.digitalkyats:id/button1"]';
    await waitForImageAttached(this, backOnFormMarker, 5 * 60_000);
    console.log('   ✓ Back on the Request Money form — continuing.');
    await this.pause(2500);
    await scrollIntoView(this, REQ.REQUEST_NOW_RADIO);

    // 6. Request Now radio
    await dump(this, 'before-radio');
    await scrollIntoView(this, REQ.REQUEST_NOW_RADIO);
    await this.click(REQ.REQUEST_NOW_RADIO);
    await this.pause(500);
    await dump(this, 'before-submit');

    // 7. Submit → confirmation popup → OK
    await this.click(REQ.SUBMIT_BUTTON);
    await this.pause(3000);
    await dump(this, 'after-submit-popup');
    const ok = await this.driver.$(REQ.OK_BUTTON);
    await ok.waitForDisplayed({ timeout: 20_000 });
    await this.click(REQ.OK_BUTTON);
    await this.pause(4000);

    // 8. Login if the login screen appeared
    if (await this.isPresent(LOGIN.PASSWORD_FIELD)) {
      await performLogin(this);
    }
  },
);

When('I confirm the success popup', async function (this: TestWorld) {
  const ok = await this.driver.$(REQ.OK_BUTTON);
  await ok.waitForDisplayed({ timeout: 30_000 });
  await this.click(REQ.OK_BUTTON);
  await this.pause(3000);
  await dump(this, 'after-success-ok');
});

Then('I return to the home screen via the back button', async function (this: TestWorld) {
  await this.backNavigateUntil(REQ.HOME_TAB, 6);
  assert.ok(
    await this.isPresent(REQ.HOME_TAB),
    'expected to land on the home screen after pressing back',
  );
});
