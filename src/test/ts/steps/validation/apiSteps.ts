/**
 * apiSteps - thin Gherkin -> apiActions bindings for the @api tag.
 * No driver dependency: these scenarios can run without an Appium server.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert';
import { TestWorld } from '../../support/world';
import { ApiActions, type ApiResponse } from '../../support/apiActions';

declare module '../../support/world' {
  interface TestWorld {
    lastApiResponse?: ApiResponse;
  }
}

const api = new ApiActions();

Given('an authenticated session', async function (this: TestWorld) {
  assert.ok(process.env.API_AUTH_TOKEN, 'API_AUTH_TOKEN env var required for @api scenarios');
});

When('I call GET {string}', async function (this: TestWorld, path: string) {
  this.lastApiResponse = await api.get(path);
});

Then('the response status should be {int}', function (this: TestWorld, expected: number) {
  assert.strictEqual(this.lastApiResponse?.status, expected);
});

Then('the response body should match the {string} schema', function (
  this: TestWorld, _schema: string,
) {
  // TODO: validate against a JSON schema in src/test/resources/schemas/.
  assert.ok(this.lastApiResponse?.body);
});
