/**
 * Login step definitions — thin glue that delegates to {@link LoginPage}.
 *
 * Steps assert and translate Gherkin into page calls; all screen knowledge
 * (locators, the login procedure) lives in the page object.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../support/world';

Given('the login screen is shown', async function (this: TestWorld) {
  assert.ok(await this.login.isShown(), 'expected the login screen');
});

When('I log in with password {string}', async function (this: TestWorld, password: string) {
  await this.login.performLogin(password);
});

When('I log in with the configured password', async function (this: TestWorld) {
  await this.login.performLogin();
});

Then('the login screen is dismissed', async function (this: TestWorld) {
  assert.ok(
    await this.login.isDismissed(),
    'expected the login screen to be dismissed after a successful login',
  );
});
