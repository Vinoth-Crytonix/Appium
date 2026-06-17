/**
 * Merchant Payment step definitions â€” thin glue mapping the step-by-step
 * Gherkin flow to {@link MerchantPaymentPage}. All screen knowledge lives
 * in the page object; this file is intentionally assertion + delegation only.
 */

import { When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';

// Default timeout for the longer merchant-payment scenario steps.
const LONG = { timeout: 15 * 60_000 };

// ===== Home ============================================================

// Note: "Given User launches the application" and "When User clicks on {string}
// from Home screen" are defined in recentTransactionsSteps.ts and dispatch by
// label across flows.

// ===== Merchant Category ===============================================

Then('User should be redirected to Merchant Category screen', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyCategoryScreen(),
    'expected to land on the Merchant Category screen',
  );
});

When('User clicks on search icon in Merchant Category screen', async function (this: TestWorld) {
  await this.merchant.tapCategorySearchIcon();
});

When('User enters random invalid input in Merchant Category search field', async function (this: TestWorld) {
  await this.merchant.enterInvalidInCategorySearch();
});

Then('User should verify no records are displayed', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyNoCategoryRecords(),
    'expected no category records for an invalid search',
  );
});

When('User clears the Merchant Category search field', async function (this: TestWorld) {
  await this.merchant.clearCategorySearch();
});

When(
  /^User enters "?(?!random invalid input\b)(.+?)"? in Merchant Category search field$/,
  async function (this: TestWorld, text: string) {
    await this.merchant.enterCategorySearchText(text);
  },
);

Then('User should verify matching category results are displayed', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyMatchingCategories(),
    'expected at least one category result for the search text',
  );
});

When('User selects a Merchant Category', async function (this: TestWorld) {
  await this.merchant.selectCategory();
});

When('User selects another Merchant Category', async function (this: TestWorld) {
  await this.merchant.selectCategory();
});

When('User verifies whether records are available in Merchant List screen', async function (this: TestWorld) {
  await this.merchant.pollUiSettled();
});

Then('If {string} message is displayed', async function (this: TestWorld, message: string) {
  assert.ok(
    await this.merchant.verifyNoRecordsMessage(message),
    `expected the "${message}" message on the Merchant List screen ` +
    `â€” the configured merchantCategory must be one with no merchants.`,
  );
});

Then('User should be redirected back to Merchant Category screen', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyCategoryScreen(),
    'expected to be back on the Merchant Category screen after device-back',
  );
});

// ===== Merchant List ===================================================

Then('User should be redirected to Merchant List screen', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyMerchantListScreen(),
    'expected to land on the Merchant List screen',
  );
});

When('User clicks on search icon in Merchant List screen', async function (this: TestWorld) {
  await this.merchant.tapListSearchIcon();
});

When('User enters random invalid input in Merchant List search field', async function (this: TestWorld) {
  await this.merchant.enterInvalidInListSearch();
});

Then('User should verify no records are displayed in Merchant List', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyNoListRecords(),
    'expected no merchant records for an invalid search',
  );
});

When('User clears the Merchant List search field', async function (this: TestWorld) {
  await this.merchant.clearListSearch();
});

When(
  /^User enters "?(?!random invalid input\b)(.+?)"? in Merchant List search field$/,
  async function (this: TestWorld, text: string) {
    await this.merchant.enterListSearchText(text);
  },
);

Then('User should verify matching merchant results are displayed', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyMatchingMerchants(),
    'expected at least one merchant result for the search text',
  );
});

When('User selects a Merchant from the Merchant List', async function (this: TestWorld) {
  await this.merchant.selectMerchant();
});

// ===== Payment Details =================================================

When(
  'User enters random amount with maximum {int} digits in Amount field',
  async function (this: TestWorld, maxDigits: number) {
    await this.merchant.enterRandomAmount(maxDigits);
  },
);

When(
  'User enters random input with maximum {int} digits in Reference field',
  async function (this: TestWorld, maxDigits: number) {
    await this.merchant.enterRandomReference(maxDigits);
  },
);

When('User enters {string} in Remarks field', async function (this: TestWorld, remarks: string) {
  // Electricity flow may abort early (popup on invalid meter) — skip to keep
  // the back-to-home tail of that scenario running cleanly.
  if (this.electricityFlowAborted) return;
  // Dispatch by active flow: electricity uses its own Remarks field, else
  // fall through to the merchant remarks field.
  if (this.electricity && (await this.electricity.tryEnterRemarks(remarks))) return;
  await this.merchant.enterRemarks(remarks);
});

// ----- Amount-field controls + sound toggle ---------------------------

When('User clicks on close button in Amount field', async function (this: TestWorld) {
  await this.merchant.clearAmount();
});

// ----- Attachments (manual gallery + camera, then delete second) ------

Then('User manually selects an image from gallery', { timeout: 10 * 60_000 }, async function (this: TestWorld) {
  await this.merchant.waitForManualAttachment();
});

When('User returns back to Pay screen', { timeout: 10 * 60_000 }, async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyPayScreen(),
    'expected the Pay screen to be displayed after the manual attachment',
  );
});

When('User selects {string} option', async function (this: TestWorld, label: string) {
  assert.strictEqual(label, 'Gallery', `unsupported attachment source "${label}"`);
  await this.merchant.tapGalleryOption();
});

// Note: 'User clicks on {string}' and 'User clicks on {string} button' are
// defined in myanmarPayHistorySteps.ts and dispatch by label across flows
// (Attach File, Done, Submit, Pay, Back To Home, ...).

When('User clicks on {string} button again', LONG, async function (this: TestWorld, label: string) {
  assert.strictEqual(label, 'Submit', `unexpected "...again" button label "${label}"`);
  await this.merchant.tapSubmit();
});

When('User performs login with valid credentials again', LONG, async function (this: TestWorld) {
  await this.merchant.performLogin();
});

Then('User should be redirected back to Pay screen', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyPayScreen(),
    'expected the Pay screen to be displayed again after the session-expired popup',
  );
});

// (Older "User selects {string} option" step removed â€” replaced by the
//  Gallery/Camera dispatcher above. The legacy "User selects any image from
//  gallery" step is also replaced by "User manually selects first image from
//  gallery" which waits for the form to return.)

// ===== Submit & Login ==================================================

Then('User should be redirected to Login screen', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.waitForLoginScreen(),
    'expected the Login screen after Submit',
  );
});

When('User performs login with valid credentials', LONG, async function (this: TestWorld) {
  await this.merchant.performLogin();
});

When('User performs login again with valid credentials', LONG, async function (this: TestWorld) {
  await this.merchant.performLogin();
});

// ===== Confirmation ====================================================

Then('User should be redirected to Confirmation screen', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyConfirmationScreen(),
    'expected to land on the Confirmation screen',
  );
});

Then('User should be redirected back to Confirmation screen', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyConfirmationScreen(),
    'expected to land back on the Confirmation screen after the second login',
  );
});

When('User waits until session expired popup appears', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.merchant.waitForSessionExpiredPopup(),
    'expected the Session Expired popup on the Confirmation screen',
  );
});

When('User clicks on {string} button in session expired popup', async function (this: TestWorld, label: string) {
  assert.strictEqual(label, 'OK', `unexpected session-expired button "${label}"`);
  await this.merchant.tapSessionExpiredOk();
});

// Note: "Then User should be redirected to Pay screen" is defined in
// recentTransactionsSteps.ts and shared across flows.

// ===== Payment success & Receipt =======================================

Then('Payment should be completed successfully', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyPaymentCompleted(),
    'expected the payment to complete successfully',
  );
  await this.merchant.captureReceipt();
});

Then('User should be redirected to Receipt screen', async function (this: TestWorld) {
  assert.ok(
    await this.merchant.verifyReceiptScreen(),
    'expected to land on the Receipt screen',
  );
});

// Note: "When User clicks on device back button" is defined in
// recentTransactionsSteps.ts and shared across flows.

// Note: 'User should be redirected to Home screen' is defined in
// myanmarPayHistorySteps.ts and checks both flows' Home tab.
