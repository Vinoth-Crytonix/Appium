/**
 * securitySteps - UI-observable security checks (@security tag).
 * Backed by basePage for UI assertions and apiActions for any token/header
 * checks. Static binary / SSL-pinning checks live in a separate suite.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { TestWorld } from '../../support/world';

Given('the app is on the login screen', async function (this: TestWorld) {
  // TODO: route through loginPage once the helper lands.
});

When('I enter {string} into the password field', async function (this: TestWorld, _value: string) {
  // TODO: route through loginPage.enterPassword.
});

Then('the password field should not reveal {string}', async function (
  this: TestWorld, _value: string,
) {
  // TODO: assert the password EditText has the inputType password mask.
});
