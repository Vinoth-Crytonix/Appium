/**
 * perfSteps - thin bindings for @performance scenarios. Real timing is
 * captured by hooks/perfHooks.ts; these steps only express thresholds.
 */

import { Given, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';

let coldStartAt: number | null = null;

Given('the app is cold-launched', async function (this: TestWorld) {
  coldStartAt = Date.now();
  // BeforeAll already launched the app for this worker; record the moment
  // the @performance scenario observed it as "cold-launched".
});

Then('the home screen should be visible within {int} ms', async function (
  this: TestWorld, threshold: number,
) {
  assert.ok(coldStartAt, 'cold start was not recorded');
  const elapsed = Date.now() - coldStartAt;
  assert.ok(
    elapsed <= threshold,
    `home screen took ${elapsed}ms (threshold ${threshold}ms)`,
  );
});
