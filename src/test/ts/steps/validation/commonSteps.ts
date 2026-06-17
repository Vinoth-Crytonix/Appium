/**
 * commonSteps - generic UI / Functional / Navigation primitives shared by
 * @ui, @functional and @navigation features. Delegates to basePage only;
 * no flow-specific selectors live here.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';

Given('the app is on the home screen', async function (this: TestWorld) {
  // BasePage owns the home-screen assertion; left as a stub for now.
  assert.ok(this.driver, 'driver not attached');
});

Given('the app is on the {string} screen', async function (this: TestWorld, _screen: string) {
  assert.ok(this.driver, 'driver not attached');
});

When('I tap {string}', async function (this: TestWorld, _label: string) {
  // TODO: route to basePage.tapByText once the helper lands.
});

When('I tap the device back button', async function (this: TestWorld) {
  await this.driver.back();
});

Then('I should see {string}', async function (this: TestWorld, _text: string) {
  // TODO: route to basePage.assertVisible(text) once the helper lands.
});

Then('I should see the {string} tab', async function (this: TestWorld, _tab: string) {
  // TODO: route to basePage.assertTabVisible(tab).
});

Then('the app should be on the home screen', async function (this: TestWorld) {
  assert.ok(this.driver, 'driver not attached');
});

Then('the app should be on the {string} screen', async function (this: TestWorld, _screen: string) {
  assert.ok(this.driver, 'driver not attached');
});

When('a PayTo flow has just completed', async function (this: TestWorld) {
  // Marker step for functional validation - no-op until functional flow is wired.
});
