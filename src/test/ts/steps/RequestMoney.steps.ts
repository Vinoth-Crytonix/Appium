/**
 * Request Money step definitions — thin glue that delegates to
 * {@link RequestMoneyPage}.
 */

import { When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../support/world';

When('I tap the Request Money tile', async function (this: TestWorld) {
  await this.requestMoney.tapRequestMoneyTile();
});

When('I tap the Enter Mobile Number option', async function (this: TestWorld) {
  await this.requestMoney.tapEnterMobileOption();
});

When(
  'I submit a Request Money for {string} attaching a gallery image',
  // Allow up to 8 minutes — the gallery step pauses for manual image selection.
  { timeout: 8 * 60_000 },
  async function (this: TestWorld, number: string) {
    await this.requestMoney.submitRequestMoney(number);
  },
);

When('I confirm the success popup', async function (this: TestWorld) {
  await this.requestMoney.confirmSuccessPopup();
});

Then('I return to the home screen via the back button', async function (this: TestWorld) {
  assert.ok(
    await this.requestMoney.returnHomeViaBack(),
    'expected to land on the home screen after pressing back',
  );
});
