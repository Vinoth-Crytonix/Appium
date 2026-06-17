/**
 * deviceSteps - merged step pool for @device, @permission, @network,
 * @notification, @interruption and @localization features. All bindings
 * delegate to support/deviceActions.ts; no selectors live here.
 *
 * Step text is prefixed by concern ("network is offline", "the camera
 * permission has been granted", ...) so the global step pool stays
 * unambiguous - see the architecture notes in the project README.
 */

import { strict as assert } from 'assert';
import { Given, When, Then } from '@cucumber/cucumber';
import { TestWorld } from '../../support/world';
import { DeviceActions } from '../../support/deviceActions';
import { driverManager } from '../../support/driverManager';
import { normalizeValue } from '../../support/stringsRepository';

function device(world: TestWorld): DeviceActions {
  return new DeviceActions(world.driver);
}

// ---- @device -----------------------------------------------------------
When('I background the app for {int} seconds', async function (this: TestWorld, seconds: number) {
  await device(this).backgroundApp(seconds);
});

When('I bring the app to the foreground', async function (this: TestWorld) {
  // background(seconds) already foregrounds at the end; no-op marker.
});

// ---- @network ----------------------------------------------------------
Given('the device is offline', async function (this: TestWorld) {
  await device(this).setOffline();
});

Given('the device is online', async function (this: TestWorld) {
  await device(this).setOnline();
});

// ---- @permission -------------------------------------------------------
Given('the camera permission has not been granted', async function (this: TestWorld) {
  await device(this).denyPermission('android.permission.CAMERA');
});

Then('a runtime permission prompt should be shown for {string}', async function (
  this: TestWorld, _permission: string,
) {
  // TODO: assert the system dialog is visible via uiautomator selector.
});

When('I open the QR scanner', async function (this: TestWorld) {
  // TODO: route through basePage.openQrScanner once the helper lands.
});

// ---- @notification -----------------------------------------------------
Given('a transaction push notification has been received', async function (this: TestWorld) {
  // TODO: trigger via adb / FCM test sender.
});

When('I tap the notification', async function (this: TestWorld) {
  // TODO: open notification shade and tap the latest entry.
});

// ---- @interruption -----------------------------------------------------
Given(
  'I am on the {string} screen with an amount of {string} entered',
  async function (this: TestWorld, _screen: string, _amount: string) {
    // TODO: navigate + type via the relevant page object.
  },
);

When('an incoming call is simulated and dismissed', async function (this: TestWorld) {
  // TODO: adb call simulation, then end-call keypress.
});

Then('the amount field should still contain {string}', async function (
  this: TestWorld, _amount: string,
) {
  // TODO: read field value and assert.
});

// ---- @localization -----------------------------------------------------
Given('the device locale is {string}', async function (this: TestWorld, locale: string) {
  await device(this).setLocale(locale);
});

When('the app is cold-launched', async function (this: TestWorld) {
  await driverManager.coldStartApp();
});

Then('the {string} tab label should be in Burmese', async function (this: TestWorld, tab: string) {
  const repo = this.strings;
  assert.ok(repo.isLoaded, 'No string resources loaded - add strings.en.xml / strings.my.xml under src/test/resources/stringValidation/');

  // Resolve the English label ("Home") to its resource name(s), then the
  // Myanmar value mapped under the same name - the cross-check at the heart of
  // the audit, applied to one known label.
  const names = repo.resolveName(tab, 'en');
  assert.ok(names.length > 0, `No English string resource has the value "${tab}" (check strings.en.xml)`);
  const burmese = names.map((n) => repo.counterpart(n, 'en')).find(Boolean);
  assert.ok(burmese, `Name "${names[0]}" has no Myanmar translation under the same name (check strings.my.xml)`);

  // The app, rendering in Burmese, should actually be displaying that value.
  const source = normalizeValue(await this.ui.getPageSource());
  assert.ok(
    source.includes(burmese as string),
    `Home screen does not display the Burmese label "${burmese}" for "${tab}"`,
  );
});
