/**
 * PayTo step definitions. All locators inline. Submitting a payment leaves
 * the app on the login screen; "I tap Submit" auto-triggers the login flow
 * (performLogin) so the scenario completes end-to-end with a receipt.
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
  // Pay tab — handles both English ("Pay") and Burmese ("ငွေပေး") locales
  PAY_TAB:        '//android.widget.TextView[@text="Pay" or @text="ငွေပေး"]',
  ACCOUNT_FIELD:  '//*[@resource-id="com.jas.digitalkyats:id/account_number_edittext"]',
  AMOUNT_FIELD:   '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_amount"]',
  REMARKS_FIELD:  '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_comment"]',
  SUBMIT_BUTTON:  '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_submit_button"]',
};

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

Given('I am on the home screen', async function (this: TestWorld) {
  // The Before hook re-launched the app to its main activity. Just verify.
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
  // Auto-trigger the login flow when the login screen appears after Submit.
  // performLogin() also handles confirmation Pay, receipt screenshot, and Home.
  if (await this.isPresent(LOGIN.PASSWORD_FIELD)) {
    await performLogin(this);
  }
  assert.ok(
    await this.isPresent(PAYTO.PAY_TAB),
    'expected to be back on the home screen after payment completion',
  );
});
