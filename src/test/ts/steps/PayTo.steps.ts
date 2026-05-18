/**
 * PayTo step definitions — thin glue that delegates to {@link PayToPage}.
 *
 * "Given I am on the home screen" is defined here but, like every Cucumber
 * step, is global — the Merchant and Request Money features reuse it.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../support/world';

Given('I am on the home screen', async function (this: TestWorld) {
  assert.ok(
    await this.payTo.waitForHome(),
    'expected to be on the home screen — Pay tab not found within 30s',
  );
});

When('I tap the Pay tab', async function (this: TestWorld) {
  await this.payTo.tapPayTab();
});

When('I enter the account number {string}', async function (this: TestWorld, account: string) {
  await this.payTo.enterAccount(account);
});

When('I enter the configured account number', async function (this: TestWorld) {
  await this.payTo.enterConfiguredAccount();
});

When('I enter a random amount with at most {int} digits', async function (this: TestWorld, maxDigits: number) {
  await this.payTo.enterRandomAmount(maxDigits);
});

When('I enter remarks {string}', async function (this: TestWorld, remarks: string) {
  await this.payTo.enterRemarks(remarks);
});

When('I tap Submit', async function (this: TestWorld) {
  await this.payTo.tapSubmit();
});

Then('the payment is completed and the receipt is captured', async function (this: TestWorld) {
  assert.ok(
    await this.payTo.completePayment(),
    'expected to be back on the home screen after payment completion',
  );
});
