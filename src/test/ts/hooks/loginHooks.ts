/**
 * loginHooks - global, module-agnostic login auto-dismiss.
 *
 * After every step, probe the login screen. If the password field is up,
 * log in with valid credentials and let the next step run on the post-login
 * screen. This means any module - PayTo, Merchant, MyanmarPay, Electricity,
 * RecentTransactions, future flows - automatically survives a re-auth prompt
 * without needing its own "If Login screen appears" check.
 *
 * Page objects keep their own inline login checks as defense in depth (some
 * actions wait inside a single step and need to handle the prompt before the
 * step finishes). The AfterStep here catches every other case.
 */

import { AfterStep } from '@cucumber/cucumber';
import { TestWorld } from '../support/world';

AfterStep(async function (this: TestWorld) {
  // BeforeAll-level steps may run before the per-scenario Before hook has
  // attached the driver; skip cleanly in that case.
  if (!this.driver) return;
  try {
    if (await this.login.isPrompted()) {
      await this.login.performLogin();
    }
  } catch {
    // Best-effort - a flaky isPresent / performLogin probe must never
    // turn a passing step into a failure.
  }
});
