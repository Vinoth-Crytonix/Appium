/**
 * Business Profile step definitions — thin glue over {@link BusinessProfilePage}.
 *
 * Only the Business-specific steps live here. The journey down to My Profile
 * ("I click the More menu", "I open My Profile", ...) and the submit chain are
 * already defined by the Personal Profile steps, and cucumber's step registry
 * is global — redefining them would be a duplicate-match error. This feature
 * reuses them as-is, which also means both flows exercise the same code path
 * for the shared screens.
 */

import { When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';

// 180s, not 90s. These steps now RECOVER rather than fail fast: a navigation
// tap re-establishes the More screen if the app slipped back to Home, scrolls,
// retries, and only then gives up. That work is bounded but genuinely exceeds
// 90s on a slow device, and when it did, cucumber killed the step with
// "function timed out" BEFORE the step's own diagnostic could be produced —
// making a recoverable situation look like an unexplained failure.
const LONG = { timeout: 180_000 };

// =========================================================================
// My Profile → Business Profile
// =========================================================================

When('I open Business Profile', LONG, async function (this: TestWorld) {
  await this.businessProfile.tapBusinessProfile();
});

Then('the Business Profile screen should be displayed', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.businessProfile.waitForBusinessProfileScreen(),
    'Business Profile screen never appeared after tapping the Business Profile option',
  );
});

// =========================================================================
// Add Business Photo
// =========================================================================

When('I scroll to the Add Business Photo option', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.businessProfile.isAddBusinessPhotoDisplayed(),
    'Add Business Photo was not reachable on the Business Profile form',
  );
});

When('I tap Add Business Photo', LONG, async function (this: TestWorld) {
  await this.businessProfile.tapAddBusinessPhoto();
});

When('I press the back button', LONG, async function (this: TestWorld) {
  await this.businessProfile.pressBack();
});

Then('the Business Profile form should still be displayed', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.businessProfile.isBackOnForm(),
    'Back did not return to the Business Profile form — the submit that follows ' +
    'would act on the wrong screen',
  );
});
