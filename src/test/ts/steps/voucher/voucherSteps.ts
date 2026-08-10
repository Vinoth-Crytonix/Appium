/**
 * Voucher step definitions — thin glue that delegates to {@link VoucherPage}.
 *
 * These exist to drive the login LOOP: the Voucher module re-authenticates on
 * every open, so "open tile → login → module → back" is a repeatable login
 * cycle that transfers no money. The login itself is driven by the existing
 * login steps (`I log in with password "..."`), which this feature reuses.
 *
 * The home-screen precondition ("I am on the home screen") and the home-return
 * assertion ("User should be redirected to Home screen") are already defined
 * by the payTo / myanmarPay steps and are reused as-is — cucumber's step
 * registry is global, so redefining them here would be a duplicate-match error.
 */

import { When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';
import { LOGIN_LOCATORS } from '../../locators/login.locators';

const LONG = { timeout: 90_000 };

When('I open the Voucher module', LONG, async function (this: TestWorld) {
  await this.voucher.openFromHome();
});

Then('the login screen should be displayed', LONG, async function (this: TestWorld) {
  // Deliberately an assertion, not the tolerant "skip if absent" probe used by
  // login.feature: in this loop a missing prompt IS the failure — it means the
  // module stopped demanding re-authentication.
  assert.ok(
    await this.login.isShown(20_000),
    'expected the Voucher module to prompt for login, but the password field never appeared',
  );
});

Then('the Voucher module should be displayed', LONG, async function (this: TestWorld) {
  assert.ok(
    !(await this.ui.isPresent(LOGIN_LOCATORS.PASSWORD_FIELD_UIA)),
    'the login screen is still up — the password was not accepted',
  );
  assert.ok(
    await this.voucher.isModuleShown(),
    'expected the Voucher module (voucher WebView) after a successful login',
  );
});

When('I leave the Voucher module', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.voucher.leaveModule(),
    'could not get back to the home screen from the Voucher module',
  );
});
