/**
 * appiumHooks - session lifecycle around a cucumber-js process.
 *
 * BeforeAll / AfterAll: one Appium session per worker (launched once, torn
 * down once). Per-scenario Before attaches the shared driver to the World
 * and navigates back to the home screen between flows.
 */

import { BeforeAll, AfterAll, Before } from '@cucumber/cucumber';
import { TestWorld } from '../support/world';
import { driverManager } from '../support/driverManager';

// 4 minutes, not 2: DriverManager retries session creation up to 4 times with a
// growing backoff, and a single attempt against a WIRELESS device (or one whose
// UiAutomator2 server has to be reinstalled) can itself take 30s+. At the old
// 120s this hook could time out mid-retry — reported as "a BeforeAll hook
// errored", which reads like a code fault rather than the slow start it is.
BeforeAll({ timeout: 240_000 }, async function () {
  await driverManager.launchApp();
});

AfterAll({ timeout: 60_000 }, async function () {
  await driverManager.stop();
});

// 180s, not 90s: this hook's WORST path is long — up to 6 back-presses, then a
// re-activate, then 3 more, then a full cold start and 3 more. That path is
// taken whenever a scenario starts with the app closed, which is exactly how
// validateAppVersion leaves the device for whichever feature runs next. At 90s
// it timed out mid-recovery and reported "Before hook errored", which reads
// like a code fault rather than a device that simply needed relaunching.
Before({ tags: 'not @login-only and not @app-version', timeout: 180_000 }, async function (this: TestWorld) {
  // Rebuild the session first if the instrumentation died during the previous
  // scenario — otherwise every remaining scenario inherits the dead session.
  await driverManager.ensureSessionAlive();
  this.driver = await driverManager.getDriver();
  const electricity = (globalThis as any).__electricityState;
  if (electricity?.lastAborted) electricity.lastAborted = false;
  // If we are already on the Home tab (the common case between scenarios),
  // navigateToHome returns immediately — no back-presses, no relaunch.
  const reached = await driverManager.navigateToHome(6);
  if (!reached) {
    // Off-app, blocking popup, or stuck on a deep screen. Try a soft
    // re-activate first; if that still can't reach Home, force a cold
    // restart so the next scenario starts on a clean Home.
    console.log('   home not reached via back — re-activating app');
    await driverManager.launchApp();
    if (!(await driverManager.navigateToHome(3))) {
      console.log('   still off-Home — cold-restarting the app');
      await driverManager.coldStartApp();
      await driverManager.navigateToHome(3);
    }
  }
});

// @login-only drives the login screen itself, and @app-version owns the whole
// app lifecycle (cold start → hold → back out until closed). Both only need the
// driver attached: forcing them onto Home first would launch the app a second
// time per scenario and, for @app-version, hide the very launch under test.
Before({ tags: '@login-only or @app-version', timeout: 60_000 }, async function (this: TestWorld) {
  // Same crash recovery as the main hook — these suites are the long soaks, so
  // they are the ones most likely to outlive an instrumentation crash.
  await driverManager.ensureSessionAlive();
  this.driver = await driverManager.getDriver();
});
