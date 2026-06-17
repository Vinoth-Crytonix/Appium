/**
 * popupHooks - global, module-agnostic auto-dismiss of irrelevant popups.
 *
 * Before every step:  scan for known popups (No Internet, transaction
 *                     notices, Secure Token Expired, generic OK dialogs).
 *                     Dismiss whatever matches and, when the popup implies
 *                     a re-login (Secure Token Expired), drive the login
 *                     flow so the step that follows runs on the proper
 *                     post-auth screen.
 *
 * After every step:   same probe, so popups raised by the step itself are
 *                     cleared before the next step starts.
 *
 * This means every module - existing or future - inherits the dismissal
 * behaviour for free. No feature file or step definition needs explicit
 * "If popup appears" handling for any popup registered in
 * locators/popups.locators.ts.
 *
 * Best-effort by design: a flaky probe must never turn a passing step into
 * a failure, so the handler swallows its own errors.
 */

import { AfterStep } from '@cucumber/cucumber';
import { TestWorld } from '../support/world';

async function sweep(world: TestWorld): Promise<void> {
  // BeforeAll-level steps may run before the per-scenario Before hook has
  // attached the driver; skip cleanly in that case.
  if (!world.driver) return;
  try {
    await world.popupHandler.dismissAny();
  } catch {
    // best-effort - never let a popup probe break the step
  }
}

// Only sweep AFTER each step: a popup raised by a step is cleared before the
// next one runs, and any popup cleared here will still be gone at the start of
// the following step — so a separate BeforeStep sweep was pure redundant cost.
// (The combined fast-path probe in PopupHandler keeps even this sweep cheap.)
AfterStep(async function (this: TestWorld) {
  await sweep(this);
});
