/**
 * stringValidationHooks - drives the string validation audit across the whole
 * suite without writing any new navigation.
 *
 * Enabled by default for EVERY run (any feature, the sequence, parallel
 * shards), so a report is always produced. Set STRING_VALIDATION_AUDIT=0 to
 * skip it on a fast run.
 *
 * AfterStep: grab the current screen's page source and audit it. The flows
 * already walk every screen, so auditing after each step gives all-screens
 * coverage for free. The auditor de-dups identical screens, so the extra
 * page-source read is the only cost and findings stay clean. Reports from
 * separate runs (e.g. an English run then a Myanmar run) merge into one file.
 *
 * AfterAll: write the JSON + HTML report.
 */

import { AfterStep, AfterAll } from '@cucumber/cucumber';
import { TestWorld } from '../support/world';
import { getStringValidationAuditor } from '../support/stringValidationAuditor';

const AUDIT_ENABLED = process.env.STRING_VALIDATION_AUDIT !== '0';

if (AUDIT_ENABLED) {
  AfterStep(async function (
    this: TestWorld,
    { pickleStep, pickle, gherkinDocument }: {
      pickleStep?: { text?: string };
      pickle?: { uri?: string };
      gherkinDocument?: { uri?: string };
    },
  ) {
    try {
      const source = await this.ui.getPageSource();
      const screen = pickleStep?.text ?? 'step';
      // Feature file basename, e.g. "payTo.feature".
      const uri = pickle?.uri ?? gherkinDocument?.uri ?? '';
      const feature = uri.split(/[\\/]/).pop() ?? '';
      getStringValidationAuditor().auditScreen(source, screen, feature);
    } catch {
      // best-effort: the audit must never fail a scenario
    }
  });

  AfterAll(function () {
    getStringValidationAuditor().writeReport();
  });
}
