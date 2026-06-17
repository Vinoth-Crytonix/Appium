/**
 * RecentTransactions step definitions - thin glue to RecentTransactionsPage.
 *
 * The "If ..." steps in the feature are realised as plain When steps that
 * record a boolean on the World; the following "And user clicks ..." step
 * checks the flag and no-ops when no Send Again button was present.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';
import type { TxnTab } from '../../pages/recentTransactionsPage';

declare module '../../support/world' {
  interface TestWorld {
    /** Set by the "If Send Again is available" step, read by the click step. */
    sendAgainAvailable?: boolean;
  }
}

// ---- Launch + entry ------------------------------------------------------

Given('User launches the application', async function (this: TestWorld) {
  // The Appium session and cold launch are handled by appiumHooks (BeforeAll).
  // We just assert the driver is attached.
  assert.ok(this.driver, 'driver not attached - check appiumHooks');
});

When('User clicks on {string} from Home screen', async function (
  this: TestWorld, label: string,
) {
  switch (label) {
    case 'Recent Transactions':
      await this.recentTransactions.openFromHome();
      return;
    case 'Merchant Payment':
      await this.merchant.tapMerchantPaymentTile();
      return;
    default:
      throw new Error(`unsupported home-screen entry "${label}"`);
  }
});

// ---- Conditional login ---------------------------------------------------

Then('If Login screen appears, user performs login with valid credentials',
  async function (this: TestWorld) {
    if (await this.login.isPrompted()) {
      await this.login.performLogin();
    }
  },
);

// ---- Recent Transactions screen -----------------------------------------

Then('User should be redirected to Recent Transactions screen',
  async function (this: TestWorld) {
    assert.ok(
      await this.recentTransactions.waitForScreen(),
      'Recent Transactions screen header not visible',
    );
  },
);

Then('User should be redirected back to Recent Transactions screen',
  async function (this: TestWorld) {
    // Back from Pay (after Send Again) sometimes lands on Home rather than the
    // Recent Transactions list — re-enter from the Home tile if so.
    await this.recentTransactions.ensureBackOnRecentTransactions();
    assert.ok(
      await this.recentTransactions.waitForScreen(),
      'expected to be back on Recent Transactions screen after device back',
    );
  },
);

// ---- Scrolling -----------------------------------------------------------

Then('User performs scroll operation in {string} transaction screen',
  async function (this: TestWorld, _tab: string) {
    await this.recentTransactions.scrollList();
  },
);

// ---- Send Again (conditional) -------------------------------------------

When('If {string} button is available in All transactions',
  async function (this: TestWorld, _label: string) {
    this.sendAgainAvailable = await this.recentTransactions.hasSendAgain();
  },
);

When('If {string} button is available in Debit transactions',
  async function (this: TestWorld, _label: string) {
    this.sendAgainAvailable = await this.recentTransactions.hasSendAgain();
  },
);

When('If {string} button is available in Credit transactions',
  async function (this: TestWorld, _label: string) {
    this.sendAgainAvailable = await this.recentTransactions.hasSendAgain();
  },
);

When('User clicks on the first available {string} button',
  async function (this: TestWorld, _label: string) {
    if (!this.sendAgainAvailable) {
      // No Send Again row in this tab - skip the rest of the sub-scenario.
      return;
    }
    const tapped = await this.recentTransactions.tapFirstSendAgain();
    assert.ok(tapped, 'expected to tap a Send Again button');
  },
);

// ---- Pay screen + back navigation ---------------------------------------

Then('User should be redirected to Pay screen', async function (this: TestWorld) {
  if (!this.sendAgainAvailable) return;
  assert.ok(
    await this.recentTransactions.waitForPayScreen(),
    'Pay screen header not visible after Send Again',
  );
});

When('User clicks on device back button', async function (this: TestWorld) {
  await this.recentTransactions.pressBack();
});

// ---- Tab switching ------------------------------------------------------

When('User clicks on {string} tab', async function (this: TestWorld, tab: string) {
  if (!['All', 'Debit', 'Credit'].includes(tab)) {
    throw new Error(`unsupported tab "${tab}"`);
  }
  await this.recentTransactions.switchTab(tab as TxnTab);
});
