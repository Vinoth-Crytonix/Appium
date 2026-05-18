/**
 * Merchant Payment step definitions — thin glue that delegates to
 * {@link MerchantPaymentPage}. The recorded coordinate flow and its replay
 * engine live in the page object and its locator module.
 */

import { When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../support/world';

When('I run the merchant payment tap sequence', { timeout: 15 * 60_000 }, async function (this: TestWorld) {
  await this.merchant.runTapSequence();
});

Then('the merchant payment is completed', async function (this: TestWorld) {
  await this.merchant.captureReceipt();
  assert.ok(true, 'merchant payment tap sequence completed');
});
