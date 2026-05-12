/**
 * PayTo step definitions. All locators inline (no Page Objects).
 *
 * Payment completion — confirmation Pay tap, receipt screenshot, and Home
 * tap — lives here, NOT in Login. Login only covers the login screen
 * (credentials + Login button). When Submit lands on the login screen,
 * PayTo's "Then" step delegates to performLogin() from Login.steps.ts to
 * authorize, then continues with the confirmation + receipt + home work.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { TestWorld } from '../support/world';
import testData from '../../resources/data/testdata.json';
import { LOGIN, performLogin } from './Login.steps';

// ---------------------------------------------------------------------------
// Locators (inline)
// ---------------------------------------------------------------------------

const PAYTO = {
  // Bottom Pay tab (English or Burmese locale)
  PAY_TAB:        '//android.widget.TextView[@text="Pay" or @text="ငွေပေး"]',

  ACCOUNT_FIELD:  '//*[@resource-id="com.jas.digitalkyats:id/account_number_edittext"]',
  AMOUNT_FIELD:   '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_amount"]',
  REMARKS_FIELD:  '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_comment"]',
  SUBMIT_BUTTON:  '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_submit_button"]',

  // Confirmation screen Pay button (English or Burmese)
  PAY_CONFIRM:
    '//*[(@text="Pay" or @text="PAY" or @text="ငွေပေး") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Pay" or @text="ငွေပေး"] ' +
    '| //*[contains(@resource-id,"pay") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"confirm") and @clickable="true"]',

  // Home button on receipt / success screen
  HOME_BUTTON:
    '//*[(@text="Home" or @text="HOME" or @text="မူလ") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Home" or @text="မူလ"] ' +
    '| //*[@content-desc="Home" or @content-desc="မူလ"] ' +
    '| //*[contains(@resource-id,"home") and @clickable="true"]',
};

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

Given('I am on the home screen', async function (this: TestWorld) {
  const el = await this.driver.$(PAYTO.PAY_TAB);
  await el.waitForDisplayed({ timeout: 20_000 });
  assert.ok(await this.isPresent(PAYTO.PAY_TAB), 'expected to be on the home screen');
});

When('I tap the Pay tab', async function (this: TestWorld) {
  await this.click(PAYTO.PAY_TAB);
  await this.pause(2500);
});

When('I enter the account number {string}', async function (this: TestWorld, account: string) {
  if (await this.isPresent(PAYTO.ACCOUNT_FIELD)) {
    await this.sendKeys(PAYTO.ACCOUNT_FIELD, account);
    await this.pause(700);
    await this.performImeDone();
    await this.pause(800);
  }
});

When('I enter the configured account number', async function (this: TestWorld) {
  if (await this.isPresent(PAYTO.ACCOUNT_FIELD)) {
    await this.sendKeys(PAYTO.ACCOUNT_FIELD, testData.payTo.account);
    await this.pause(700);
    await this.performImeDone();
    await this.pause(800);
  }
});

When('I enter a random amount with at most {int} digits', async function (this: TestWorld, maxDigits: number) {
  const upper = Math.pow(10, maxDigits);
  const lower = Math.max(1, Math.pow(10, Math.max(1, maxDigits - 1)));
  const amount = String(lower + Math.floor(Math.random() * (upper - lower)));
  await this.sendKeys(PAYTO.AMOUNT_FIELD, amount);
  await this.pause(400);
});

When('I enter remarks {string}', async function (this: TestWorld, remarks: string) {
  await this.sendKeys(PAYTO.REMARKS_FIELD, remarks);
  await this.hideKeyboard();
  await this.pause(500);
});

When('I tap Submit', async function (this: TestWorld) {
  await this.click(PAYTO.SUBMIT_BUTTON);
  await this.pause(4000);
});

Then('the payment is completed and the receipt is captured', async function (this: TestWorld) {
  // 1. Authorize — if the login screen appeared after Submit, delegate to
  //    performLogin() (credentials + Login button only). Login.steps owns
  //    only the login screen; payment completion is PayTo's job.
  if (await this.isPresent(LOGIN.PASSWORD_FIELD)) {
    await performLogin(this);
  }

  // 2. Confirmation — tap Pay
  await this.click(PAYTO.PAY_CONFIRM);
  await this.pause(7000);

  // 3. Receipt — capture screenshot
  await this.screenshotToTarget('receipt.png');

  // 4. Home — tap to return
  await this.click(PAYTO.HOME_BUTTON);
  await this.pause(2500);

  // 5. Verify we're back on the home screen
  assert.ok(
    await this.isPresent(PAYTO.PAY_TAB),
    'expected to be back on the home screen after payment completion',
  );
});
