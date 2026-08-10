/**
 * stepLogHooks - a clean, human-readable per-step trace in the run log.
 *
 * Cucumber's default output only lists steps (with noisy "# file.ts:NN"
 * locations) when a scenario FAILS, and a passing run shows no steps at all.
 * This hook prints one tidy line per step - the step text and a pass/fail/skip
 * mark, no file/line noise - so every run reads as a clear step-by-step story.
 *
 * Placement of the popup note: the global popup hook (globalPopupHooks) runs
 * its AfterStep BEFORE this one (loaded earlier alphabetically), so when an
 * unexpected popup is dismissed its "⚠ ..." line prints immediately ABOVE the
 * step result line it belongs to - right next to the step being executed,
 * instead of floating above the whole scenario.
 *
 * Output only (no driver calls), so it can never affect a step's result.
 */

import { Before, AfterStep } from '@cucumber/cucumber';
import { TestWorld } from '../support/world';
import { deviceLog } from '../support/logger';

Before(function (this: TestWorld, params: any) {
  const name = params?.pickle?.name ?? 'scenario';
  // One cucumber process per device, so this prints to that device's own stdout;
  // the runner captures it and writes each device as one grouped block.
  deviceLog(`\n──────── Scenario: ${name} ────────`);
});

AfterStep(function (this: TestWorld, params: any) {
  const text = params?.pickleStep?.text ?? 'step';
  const status = String(params?.result?.status ?? 'unknown').toUpperCase();
  const mark =
    status === 'PASSED'  ? '✓' :
    status === 'FAILED'  ? '✗' :
    status === 'SKIPPED' ? '○' : '•';
  deviceLog(`   ${mark} ${text}`);
});
