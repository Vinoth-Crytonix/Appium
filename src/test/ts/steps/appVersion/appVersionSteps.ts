/**
 * Launch-stability step definitions for the securityLayer suite.
 *
 * The cycle is deliberately tiny: cold-start the app, hold it open for a few
 * seconds, then press Back until it is closed. Repeated N times via the
 * runner's --count flag that is a launch soak — the cheapest way to catch a
 * build that crashes or ANRs on the Nth cold start, with no UI dependency
 * beyond the Back key.
 *
 * Step wording is kept distinct from the flow suites' "User clicks on device
 * back button" / "User launches the application" — cucumber's step registry is
 * global, and those two are owned by recentTransactionsSteps.
 */

import { When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';
import { driverManager } from '../../support/driverManager';
import { AUT_PACKAGE } from '../../locators/common.locators';

const LONG = { timeout: 90_000 };

/** Back presses allowed before giving up — the app rarely needs more than 2. */
const MAX_BACKS = 6;

/** The foreground package, or '' if the driver won't say. */
async function foregroundPackage(world: TestWorld): Promise<string> {
  try {
    return await world.driver.getCurrentPackage();
  } catch {
    // Some UiAutomator2 builds throw while the launcher is settling. Treat that
    // as "not the app", which is what the caller is asking about.
    return '';
  }
}

/**
 * Cold start — terminate first, then activate. A plain activate would just
 * re-surface the process left over from the previous cycle, which tests
 * nothing: the point of the loop is to exercise the LAUNCH path N times.
 */
When('I start the app', LONG, async function (this: TestWorld) {
  await driverManager.coldStartApp();
});

When('I hold the app open for {int} seconds', LONG, async function (this: TestWorld, seconds: number) {
  await this.ui.pause(seconds * 1_000);
});

/**
 * Press Back until the app is no longer foreground — usually two presses.
 *
 * PACING IS THE WHOLE TRICK. This build exits on a "press Back again to exit"
 * double-tap window of roughly two seconds; miss it and the next press merely
 * re-arms the window, forever. One getCurrentPackage round-trip alone costs
 * ~1.3s over UiAutomator2, so a press/settle/check cycle must stay lean: one
 * short sleep and ONE foreground check per press (~1.7s end to end, measured).
 * An earlier version polled up to 2s in 250ms slices between presses — a ~4s
 * gap — and never exited, on either device, in any of 20 cycles.
 *
 * The press count is not hard-coded, so a build that adds or drops a confirm
 * step still leaves a clean device behind for the next cycle.
 */
When('I press the device back button until the app is closed', LONG, async function (this: TestWorld) {
  for (let i = 0; i < MAX_BACKS; i++) {
    await this.ui.back();
    await this.ui.pause(400);
    if ((await foregroundPackage(this)) !== AUT_PACKAGE) return;
  }
});

Then('the app should be closed', LONG, async function (this: TestWorld) {
  // One retry: the launcher can still be settling when the last press lands.
  let foreground = await foregroundPackage(this);
  if (foreground === AUT_PACKAGE) {
    await this.ui.pause(1_000);
    foreground = await foregroundPackage(this);
  }
  assert.notStrictEqual(
    foreground,
    AUT_PACKAGE,
    `"${AUT_PACKAGE}" is still in the foreground after ${MAX_BACKS} back presses`,
  );
});
