/**
 * Login step definitions. ONLY covers the login screen:
 *   - enter password
 *   - tap the Login button
 *
 * Confirmation Pay, receipt screenshot and Home are PayTo's responsibility
 * (see PayTo.steps.ts). performLogin() is exported so the PayTo "Then"
 * step can call it whenever the login screen appears during the flow.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { TestWorld } from '../support/world';
import testData from '../../resources/data/testdata.json';

// ---------------------------------------------------------------------------
// Locators (inline) — login screen only
// ---------------------------------------------------------------------------

export const LOGIN = {
  PASSWORD_FIELD: '//*[@resource-id="com.jas.digitalkyats:id/otp_edit_text_password"]',
  LOGIN_BUTTON:   '//*[@resource-id="com.jas.digitalkyats:id/otp_button_otp_1"]',
};

// ---------------------------------------------------------------------------
// Reusable: enter credentials and tap Login. NOTHING else.
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
}

// ---------------------------------------------------------------------------
// Step definitions for Login.feature
// ---------------------------------------------------------------------------

Given('the login screen is shown', async function (this: TestWorld) {
  const el = await this.driver.$(LOGIN.PASSWORD_FIELD);
  await el.waitForDisplayed({ timeout: 20_000 });
  assert.ok(await this.isPresent(LOGIN.PASSWORD_FIELD), 'expected the login screen');
});

When('I log in with password {string}', async function (this: TestWorld, password: string) {
  await performLogin(this, password);
});

When('I log in with the configured password', async function (this: TestWorld) {
  await performLogin(this);
});

Then('the login screen is dismissed', async function (this: TestWorld) {
  // After a successful login, the password field is no longer on screen.
  assert.ok(
    !(await this.isPresent(LOGIN.PASSWORD_FIELD)),
    'expected the login screen to be dismissed after a successful login',
  );
});
