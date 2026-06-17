/**
 * Myanmar Pay Personal step definitions - thin glue to MyanmarPayPersonalPage.
 *
 * The Upload-QR step blocks for up to a minute so the human can pick an image
 * from the system gallery; the page resolves to 'payment' (valid QR),
 * 'wrong' (invalid QR popup) or 'timeout'. The wrong-QR retry loop is encoded
 * directly in the step bindings so the feature stays declarative.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';
import { HOME_TAB } from '../../locators/common.locators';
import { driverManager } from '../../support/driverManager';

/**
 * Shared lifecycle step — used by both Myanmar Pay features. If the AUT
 * isn't in the foreground, activates it; then taps the bottom-nav Home
 * icon so the Home grid is actually showing for whatever follows.
 */
Given('the app is active and on the Home screen', async function (this: TestWorld) {
  await driverManager.ensureHomeScreen();
});

Given('User is on the home screen for Myanmar Pay', async function (this: TestWorld) {
  assert.ok(
    await this.payTo.waitForHome(),
    'expected to be on the home screen - Pay tab not found',
  );
});

When('User taps the Myanmar Pay module', async function (this: TestWorld) {
  await this.myanmarPayPersonal.tapMyanmarPayTile();
});

Then('If the scanner screen appears, the subscriber UI is validated',
  async function (this: TestWorld) {
    if (!(await this.myanmarPayPersonal.isScannerShown())) return;
    const ui = await this.myanmarPayPersonal.validateScannerUi();
    assert.ok(ui.header,   'scanner header not visible');
    assert.ok(ui.torch,    'torch icon not visible');
    assert.ok(ui.uploadQr, 'upload QR button not visible');
  },
);

When('User toggles the torch on and off', async function (this: TestWorld) {
  await this.myanmarPayPersonal.toggleTorch(); // on
  await this.myanmarPayPersonal.toggleTorch(); // off
});

/**
 * Upload-QR with retry. The user picks an image manually; we wait, then
 * branch on the outcome. If the first pick is wrong, dismiss the popup,
 * tap Upload QR again and wait a second time. Two attempts is the spec.
 */
When('User uploads a QR and selects the image manually',
  async function (this: TestWorld) {
    await this.myanmarPayPersonal.tapUploadQr();
    let outcome = await this.myanmarPayPersonal.waitForGalleryPickResolution();

    if (outcome === 'wrong') {
      await this.myanmarPayPersonal.dismissWrongQrPopup();
      await this.myanmarPayPersonal.tapUploadQr();
      outcome = await this.myanmarPayPersonal.waitForGalleryPickResolution();
    }

    assert.notStrictEqual(outcome, 'timeout',
      'no image selected within 60s - the gallery pick did not complete');
    assert.strictEqual(outcome, 'payment',
      'expected to land on the Myanmar Pay payment screen after QR selection');
  },
);

Then('User should be redirected to the Myanmar Pay payment screen',
  async function (this: TestWorld) {
    assert.ok(
      await this.myanmarPayPersonal.waitForPaymentScreen(),
      'Myanmar Pay payment screen header not visible',
    );
  },
);

When('User enters a random amount with at most 3 digits',
  async function (this: TestWorld) {
    await this.myanmarPayPersonal.enterRandomAmount();
  },
);

When('User enters remarks {string}', async function (this: TestWorld, remarks: string) {
  await this.myanmarPayPersonal.enterRemarks(remarks);
});

When('User taps Confirm Payment', async function (this: TestWorld) {
  await this.myanmarPayPersonal.tapConfirmPayment();
});

Then('The receipt screen is shown and captured', async function (this: TestWorld) {
  assert.ok(
    await this.myanmarPayPersonal.waitForReceipt(),
    'receipt marker not visible after Confirm Payment',
  );
  await this.myanmarPayPersonal.captureReceipt();
});

Then('User stores the payment details in a file', async function (this: TestWorld) {
  await this.myanmarPayPersonal.recordPaymentDetails();
});

When('User taps Invoice and presses back', async function (this: TestWorld) {
  await this.myanmarPayPersonal.tapInvoice();
  await this.myanmarPayPersonal.pressBack();
});

When('User taps Share and presses back', async function (this: TestWorld) {
  await this.myanmarPayPersonal.tapShare();
  await this.myanmarPayPersonal.pressBack();
});

/**
 * Open Share, then press back repeatedly until the bottom-nav Home tab is
 * visible. Caps attempts so we don't loop forever if back doesn't pop.
 */
When('User taps Share and presses back until the home screen is reached',
  async function (this: TestWorld) {
    await this.myanmarPayPersonal.tapShare();
    for (let i = 0; i < 6; i++) {
      await this.myanmarPayPersonal.pressBack();
      if (await this.ui.isPresent(HOME_TAB)) return;
    }
  },
);
