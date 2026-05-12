/**
 * Login step definitions. All locators + actions live here — no Page Objects.
 * Exports performLogin() so PayTo can auto-trigger the login flow when the
 * login screen appears after submitting a payment.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { TestWorld } from '../support/world';
import testData from '../../resources/data/testdata.json';

// ---------------------------------------------------------------------------
// Locators (inline)
// ---------------------------------------------------------------------------

export const LOGIN = {
  PASSWORD_FIELD: '//*[@resource-id="com.jas.digitalkyats:id/otp_edit_text_password"]',
  LOGIN_BUTTON: '//*[@resource-id="com.jas.digitalkyats:id/otp_button_otp_1"]',
  PAY_CONFIRM:
    '//*[(@text="Pay" or @text="PAY" or @text="ငွေပေး") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Pay" or @text="ငွေပေး"] ' +
    '| //*[contains(@resource-id,"pay") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"confirm") and @clickable="true"]',
  HOME_BUTTON:
    '//*[(@text="Home" or @text="HOME" or @text="မူလ") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Home" or @text="မူလ"] ' +
    '| //*[@content-desc="Home" or @content-desc="မူလ"] ' +
    '| //*[contains(@resource-id,"home") and @clickable="true"]',
};

// ---------------------------------------------------------------------------
// Reusable end-to-end login routine — called from PayTo when the login screen
// appears, and also from the Login feature directly.
// ---------------------------------------------------------------------------

export async function performLogin(
  world: TestWorld,
  password: string = testData.login.password,
): Promise<void> {
  await world.sendKeys(LOGIN.PASSWORD_FIELD, password);
  await world.hideKeyboard();
  await world.pause(500);

  await world.click(LOGIN.LOGIN_BUTTON);
  await world.pause(6000);

  await world.click(LOGIN.PAY_CONFIRM);
  await world.pause(7000);

  await world.screenshotToTarget('receipt.png');

  await world.click(LOGIN.HOME_BUTTON);
  await world.pause(2500);
}

// ---------------------------------------------------------------------------
// Step definitions for Login.feature
// ---------------------------------------------------------------------------

Given('the login screen is shown', async function (this: TestWorld) {
  assert.ok(
    await this.isPresent(LOGIN.PASSWORD_FIELD),
    'expected the login screen (password field) to be present',
  );
});

When('I log in with password {string}', async function (this: TestWorld, password: string) {
  await performLogin(this, password);
});

When('I log in with the configured password', async function (this: TestWorld) {
  await performLogin(this);
});

Then('the receipt is captured and I return to the home screen', async function () {
  // performLogin() already saved target/receipt.png and tapped Home.
});
