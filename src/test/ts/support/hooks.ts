/**
 * Cucumber lifecycle hooks — extracted from the World so that "what runs
 * around a scenario" is separate from "what a scenario can do".
 *
 * Driver lifecycle is per cucumber-js process (BeforeAll / AfterAll): the app
 * is launched once and every scenario shares the session. Between scenarios
 * we only navigate back to the home screen — no terminate / activate.
 */

import {
  BeforeAll, AfterAll, Before, After, Status, ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { TestWorld } from './world';
import { driverManager } from './DriverManager';

// Launch the app ONCE at the start of the cucumber-js process.
BeforeAll({ timeout: 120_000 }, async function () {
  await driverManager.launchApp();
});

// Kill the session ONCE at the end of the cucumber-js process.
AfterAll({ timeout: 60_000 }, async function () {
  await driverManager.stop();
});

// Per-scenario Before — attach the shared driver and ensure we're on home.
Before({ tags: 'not @login-only', timeout: 60_000 }, async function (this: TestWorld) {
  this.driver = await driverManager.getDriver();
  await driverManager.navigateToHome(6);
});

// @login-only scenarios expect the device to already be on the login screen.
Before({ tags: '@login-only', timeout: 60_000 }, async function (this: TestWorld) {
  this.driver = await driverManager.getDriver();
});

// Capture a screenshot on failure; never delete the session (it lives for the run).
After({ timeout: 60_000 }, async function (this: TestWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED) {
    try {
      const safe = (scenario.pickle.name || 'scenario').replace(/[^a-z0-9-]+/gi, '_');
      await this.diagnostics.screenshot(`failure-${safe}.png`);
    } catch { /* ignore */ }
  }
});
