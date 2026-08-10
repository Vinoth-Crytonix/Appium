/**
 * runStringValidationAudit - runs a feature (or the full sequence) with the
 * string validation audit on and the run's language recorded, so the per-
 * feature report files are named by language.
 *
 * Usage (via npm):
 *   npm run test:stringValidation:en  -- --feature payTo
 *   npm run test:stringValidation:my  -- --feature payTo
 *   npm run test:stringValidation:en                      (no --feature => full sequence)
 *
 * Args:
 *   --lang en|my       language the app is currently showing. Recorded as
 *                      STRING_VALIDATION_LANG so report files are named
 *                      <feature>_<lang>_<time>. Switch the app to this language
 *                      BEFORE running.
 *   --feature <name>   run a single feature (payTo, merchant, ...). Omit to run
 *                      the full sequence.
 *
 * Reports are written fresh per run (never appended) under
 * target/stringValidation/<feature>/. Run a feature in English then in Myanmar
 * and the second run auto-writes the side-by-side comparison file.
 */

import { spawn } from 'child_process';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const lang = (arg('lang') ?? 'auto').toLowerCase();
const feature = arg('feature');
const langLabel = lang === 'my' ? 'Myanmar' : lang === 'en' ? 'English' : 'current';

// The runner is path-based. Map the friendly feature name to its path (or accept
// a raw path), and for the no-feature case run the flow features in order.
const FEATURE_PATHS: Record<string, string> = {
  login:              'src/test/resources/features/login/login.feature',
  payTo:              'src/test/resources/features/payTo/payTo.feature',
  merchant:           'src/test/resources/features/merchantPayment/merchantPayment.feature',
  requestMoney:       'src/test/resources/features/requestMoney/requestMoney.feature',
  recentTransactions: 'src/test/resources/features/recentTransactions/recentTransactions.feature',
  myanmarPayPersonal: 'src/test/resources/features/myanmarPay/myanmarPayPersonal.feature',
  myanmarPayHistory:  'src/test/resources/features/myanmarPay/myanmarPayHistory.feature',
  electricity:        'src/test/resources/features/electricity/electricity.feature',
};

const SEQUENCE_PATHS = [
  FEATURE_PATHS.payTo,
  FEATURE_PATHS.requestMoney,
  FEATURE_PATHS.merchant,
  FEATURE_PATHS.myanmarPayPersonal,
  FEATURE_PATHS.myanmarPayHistory,
  FEATURE_PATHS.electricity,
  FEATURE_PATHS.recentTransactions,
];

const targetPaths = feature
  ? [FEATURE_PATHS[feature] ?? feature] // friendly name OR a raw feature path
  : SEQUENCE_PATHS;

const runnerArgs = ['src/test/ts/runner/runner.ts', ...targetPaths];

console.log('────────────────────────────────────────────────────────');
console.log(` String validation run — app language: ${langLabel}`);
console.log(` Target: ${feature ? `feature "${feature}"` : 'full sequence'}`);
console.log(' Make sure the app is set to that language before continuing.');
console.log(' Reports: target/stringValidation/<feature>/');
console.log('────────────────────────────────────────────────────────');

const child = spawn('ts-node', runnerArgs, {
  stdio: 'inherit',
  shell: true, // resolve ts-node from node_modules/.bin (npm adds it to PATH)
  env: {
    ...process.env,
    STRING_VALIDATION_AUDIT: '1',
    STRING_VALIDATION_LANG: lang === 'en' || lang === 'my' ? lang : '',
  },
});

child.on('exit', (code) => process.exit(code ?? 0));
