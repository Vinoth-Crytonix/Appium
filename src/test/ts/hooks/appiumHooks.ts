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

BeforeAll({ timeout: 120_000 }, async function () {
  await driverManager.launchApp();
});

AfterAll({ timeout: 60_000 }, async function () {
  await driverManager.stop();
});

Before({ tags: 'not @login-only', timeout: 90_000 }, async function (this: TestWorld) {
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

Before({ tags: '@login-only', timeout: 60_000 }, async function (this: TestWorld) {
  this.driver = await driverManager.getDriver();
});
