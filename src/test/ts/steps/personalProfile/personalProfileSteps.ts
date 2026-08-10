/**
 * Personal Profile step definitions — thin glue that delegates to
 * {@link PersonalProfilePage}.
 *
 * WORDING IS DELIBERATELY FIRST-PERSON ("I open …"), matching the rest of the
 * securityLayer suite (voucher, appVersion). Cucumber's step registry is
 * global and reportsSteps already owns the third-person navigation phrasings
 * — "User clicks on {string} button from Home screen", "User should be
 * redirected to More screen", "User clicks on {string} option" — so reusing
 * those here would be a duplicate-definition error.
 *
 * The home-screen precondition ("I am on the home screen") is defined by
 * payToSteps and reused as-is.
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
// Navigation: Home → More → My Profile → Personal Profile
// =========================================================================

When('I click the More menu', LONG, async function (this: TestWorld) {
  await this.personalProfile.tapMore();
});

Then('the More screen should be displayed', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.personalProfile.waitForMoreScreen(),
    'More screen header never appeared after tapping the More tile',
  );
});

When('I open My Profile', LONG, async function (this: TestWorld) {
  await this.personalProfile.tapMyProfile();
});

Then('the My Profile screen should be displayed', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.personalProfile.waitForMyProfileScreen(),
    'My Profile screen never appeared after tapping the My Profile option',
  );
});

When('I open Personal Profile', LONG, async function (this: TestWorld) {
  await this.personalProfile.tapPersonalProfile();
});

Then('the Personal Profile screen should be displayed', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.personalProfile.waitForPersonalProfileScreen(),
    'Personal Profile screen never appeared after tapping the Personal Profile option',
  );
});

// =========================================================================
// Edit mode
// =========================================================================

When('I tap the Edit icon in the footer', LONG, async function (this: TestWorld) {
  await this.personalProfile.tapFooterEditIcon();
});

Then('the profile fields should become editable', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.personalProfile.waitForEditMode(),
    'the profile stayed read-only — the footer Edit icon did not open edit mode',
  );
});

// =========================================================================
// Email field
// =========================================================================

When('I scroll to the email field', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.personalProfile.scrollToEmailField(),
    'scrolled the profile form but never found the email field',
  );
});

Then('the email field should be displayed', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.personalProfile.isEmailFieldDisplayed(),
    'email field is not on screen after the scroll',
  );
});

/**
 * `email` may carry a `{random}` token; the page swaps it for a short random
 * suffix so a repeated run never resubmits the address already on file.
 */
When('I edit the email field with {string}', LONG, async function (this: TestWorld, email: string) {
  const typed = await this.personalProfile.editEmail(email);
  this.attach(`email submitted: ${typed}`);
});

// =========================================================================
// Submit
// =========================================================================

When('I submit the profile details', LONG, async function (this: TestWorld) {
  await this.personalProfile.submitDetails();
});

Then('the profile update should be accepted', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.personalProfile.waitForSubmitAccepted(),
    `profile update was not accepted for "${this.personalProfile.submittedEmail}" — ` +
    'no success message and the form never returned to read-only',
  );
});

// =========================================================================
// Reset
// =========================================================================

When('I leave the profile screens', LONG, async function (this: TestWorld) {
  assert.ok(
    await this.personalProfile.returnToHome(),
    'could not get back to the home screen from the profile stack',
  );
});
