/**
 * screenshotHooks - capture a screenshot at the end of every scenario
 * (pass or fail). The status is encoded into the file name so a failed run
 * stands out in the target/ directory without overwriting a prior pass.
 *
 * Also runs an AfterAll hook that regenerates the HTML report after the
 * cucumber-js process finishes its scenarios, so reports stay fresh for
 * every run — direct cucumber-js invocations included.
 */

import { After, ITestCaseHookParameter } from '@cucumber/cucumber';
import { spawnSync } from 'child_process';
import * as path from 'path';
import { TestWorld } from '../support/world';

After({ timeout: 60_000 }, async function (this: TestWorld, scenario: ITestCaseHookParameter) {
  try {
    const status = (scenario.result?.status ?? 'unknown').toString().toLowerCase();
    const safe = (scenario.pickle.name || 'scenario').replace(/[^a-z0-9-]+/gi, '_');
    await this.diagnostics.screenshot(`${status}-${safe}.png`);
  } catch { /* ignore - never break the run on a failed screenshot */ }
});

// Register a process-exit handler so the HTML report is regenerated AFTER
// cucumber-js flushes its JSON formatter (which happens after AfterAll).
// `spawnSync` is synchronous and works inside the 'exit' event, where async
// work would not.
let reportRegenerated = false;
process.on('exit', () => {
  if (reportRegenerated) return;
  reportRegenerated = true;
  try {
    const result = spawnSync(
      'node',
      [path.resolve('src/test/ts/reporting/generate-report.js')],
      { stdio: 'inherit', shell: true },
    );
    if (result.status !== 0) {
      console.warn('[reportHook] generate-report exited with status', result.status);
    }
  } catch (e) {
    console.warn('[reportHook] failed to regenerate HTML report:', (e as Error).message);
  }
});
