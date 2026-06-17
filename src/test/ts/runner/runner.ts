/**
 * runner - single entry point for the test suite.
 *
 * Two responsibilities, kept in one file because they are read together:
 *   1. ANDROID_DEVICES - device caps per cucumber-js worker (imported by driverManager).
 *   2. CLI dispatcher  - parses --feature / --tags / --parallel and spawns cucumber-js.
 *
 * The user picks what to run; this file does not enshrine any smoke/regression
 * notion. Tag expressions and feature shortcuts are passed through verbatim.
 *
 * Parallel model: cucumber-js spawns N workers (`--parallel N`). Each worker is
 * one OS process; we shard one device per worker by reading CUCUMBER_WORKER_ID
 * ("0", "1", ...). Add a third entry to ANDROID_DEVICES and pass `--parallel 3`.
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawn, spawnSync } from 'child_process';

// =============================================================================
// target/ housekeeping - one log per run, no scattered XML / status PNG noise
// =============================================================================

const TARGET_DIR     = path.resolve('target');
const DIAGNOSTICS_DIR = path.join(TARGET_DIR, 'diagnostics');
const LOGS_DIR       = path.join(TARGET_DIR, 'logs');

/**
 * Per-run log path. ONE log file per runner invocation - never one per
 * feature. Every step (single-feature, tag-driven, or full --sequence)
 * appends its section into the same file under target/logs/. The file
 * opens with a "running" status and is renamed to passed/failed when
 * the runner finishes, so an interrupted run is still identifiable.
 */
function istTimestamp(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}_${get('hour')}-${get('minute')}-${get('second')}_IST`;
}

function buildRunLogPath(status: string, timestamp: string): string {
  return path.join(LOGS_DIR, `appium_run_${status}_${timestamp}.log`);
}

/**
 * Sweep target/ of stale artifacts BEFORE a new run so the folder stays
 * clean. We preserve the things the next run actually needs: the JSON
 * report (cucumber overwrites it), the HTML report (regenerated post-run),
 * Excel reports, persistent receipt PNGs, and the per-run logs in target/logs/
 * (which accumulate across runs — never wiped).
 */
function cleanTargetForFreshRun(): void {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  } else {
    for (const entry of fs.readdirSync(TARGET_DIR, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === 'diagnostics') {
          // Wipe stale page-source dumps from the previous run.
          try { fs.rmSync(path.join(TARGET_DIR, entry.name), { recursive: true, force: true }); }
          catch { /* ignore */ }
        }
        // target/logs/ and any other subdir: leave alone.
        continue;
      }
      const name = entry.name;
      // Keep: live reports + receipts + cross-run audit logs.
      if (name === 'cucumber-report.json') continue;
      if (name === 'cucumber-html.html')   continue;
      if (name === 'transactions.log')     continue;
      if (name.endsWith('-receipt.png'))   continue;
      if (name.endsWith('.xlsx'))          continue;
      // Drop: stale top-level logs, XML dumps, status-prefixed PNGs.
      const status = name.match(/^(passed|failed|skipped|unknown|failure)-/);
      if (status || name.endsWith('.xml') || name.endsWith('.log')) {
        try { fs.unlinkSync(path.join(TARGET_DIR, name)); } catch { /* ignore */ }
      }
    }
  }
  fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/** ANSI escape codes pollute log files - strip them before persisting. */
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

// =============================================================================
// Device caps (consumed by support/driverManager.ts)
// =============================================================================

export interface DeviceCaps {
  deviceLabel: string;
  appiumServerUrl: string;
  capabilities: Record<string, unknown>;
}

const baseAndroidCaps = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../resources/config/android.caps.json'),
    'utf8',
  ),
) as Record<string, unknown>;

export const ANDROID_DEVICES: DeviceCaps[] = [
  {
    deviceLabel: 'android-1',
    appiumServerUrl: process.env.APPIUM_URL_1 ?? 'http://127.0.0.1:4723/',
    capabilities: {
      ...baseAndroidCaps,
      'appium:udid': process.env.DEVICE_UDID_1 ?? baseAndroidCaps['appium:udid'],
      'appium:deviceName': process.env.DEVICE_NAME_1 ?? 'android-1',
      'appium:systemPort': 8200,
    },
  },
  {
    deviceLabel: 'android-2',
    appiumServerUrl: process.env.APPIUM_URL_2 ?? 'http://127.0.0.1:4724/',
    capabilities: {
      ...baseAndroidCaps,
      'appium:udid': process.env.DEVICE_UDID_2 ?? 'TODO-second-device-udid',
      'appium:deviceName': process.env.DEVICE_NAME_2 ?? 'android-2',
      'appium:systemPort': 8201,
    },
  },
];

export function getCapsForCurrentWorker(): DeviceCaps {
  const workerId = Number(process.env.CUCUMBER_WORKER_ID ?? '0');
  const slot = ANDROID_DEVICES[workerId];
  if (!slot) {
    throw new Error(
      `No device caps for CUCUMBER_WORKER_ID=${workerId}. ` +
      `Configured ${ANDROID_DEVICES.length} device(s) in runner.ts.`,
    );
  }
  return slot;
}

// =============================================================================
// Single-feature shortcuts (used by --feature <name>)
// =============================================================================

export const FEATURES: Record<string, string> = {
  login:         'src/test/resources/features/login/login.feature',
  payTo:         'src/test/resources/features/payTo/payTo.feature',
  merchant:      'src/test/resources/features/merchantPayment/merchantPayment.feature',
  requestMoney:  'src/test/resources/features/requestMoney/requestMoney.feature',
  recentTransactions: 'src/test/resources/features/recentTransactions/recentTransactions.feature',
  myanmarPayPersonal: 'src/test/resources/features/myanmarPay/myanmarPayPersonal.feature',
  myanmarPayHistory:  'src/test/resources/features/myanmarPay/myanmarPayHistory.feature',
  electricity:   'src/test/resources/features/electricity/electricity.feature',

  ui:            'src/test/resources/features/validation/uiValidation.feature',
  functional:    'src/test/resources/features/validation/functionalValidation.feature',
  navigation:    'src/test/resources/features/validation/navigationValidation.feature',
  api:           'src/test/resources/features/validation/apiDataValidation.feature',
  device:        'src/test/resources/features/validation/deviceValidation.feature',
  permission:    'src/test/resources/features/validation/permissionValidation.feature',
  network:       'src/test/resources/features/validation/networkValidation.feature',
  security:      'src/test/resources/features/validation/securityValidation.feature',
  performance:   'src/test/resources/features/validation/performanceValidation.feature',
  notification:  'src/test/resources/features/validation/notificationValidation.feature',
  interruption:  'src/test/resources/features/validation/interruptionValidation.feature',
  localization:  'src/test/resources/features/validation/localizationValidation.feature',
};

// =============================================================================
// CLI dispatcher
// =============================================================================

interface RunnerArgs {
  feature?: string;
  tags?: string;
  parallel?: number;
  retry?: number;
  sequence?: boolean;
  skipValidation?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): RunnerArgs {
  const out: RunnerArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--feature') out.feature = argv[++i];
    else if (a === '--tags') out.tags = argv[++i];
    else if (a === '--parallel') out.parallel = Number(argv[++i]);
    else if (a === '--retry') out.retry = Number(argv[++i]);
    else if (a === '--sequence') out.sequence = true;
    else if (a === '--skip-validation') out.skipValidation = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printHelp(): void {
  console.log(`
Usage: ts-node src/test/ts/runner/runner.ts [options]

Options:
  --feature <name>    Run a single feature file. One of:
                      ${Object.keys(FEATURES).join(', ')}
  --tags "<expr>"     Cucumber tag expression (e.g. "@login-only", "not @wip")
  --sequence          Run the full ordered flow: payTo, requestMoney, merchant,
                      myanmarPayPersonal, myanmarPayHistory, electricity,
                      recentTransactions — with all validation areas executed
                      between each flow. Each step writes its own log to
                      target/logs/.
  --parallel <N>      Number of devices (1..${ANDROID_DEVICES.length})
  --retry <N>         Retry failed scenarios N times
  -h, --help          This help

Examples:
  ts-node src/test/ts/runner/runner.ts --feature merchant
  ts-node src/test/ts/runner/runner.ts --feature payTo --parallel 2
  ts-node src/test/ts/runner/runner.ts --tags "@login-only"
  ts-node src/test/ts/runner/runner.ts --sequence
  ts-node src/test/ts/runner/runner.ts                       # run everything (default)
`);
}

/** Ordered sequence: 6 flow steps (myanmarPay is split into two), with the
 *  full validation pack between each flow. Each entry becomes one cucumber-js
 *  invocation with its own per-run log in target/logs/. */
interface SequenceStep {
  label: string;          // shows up in the log filename
  feature?: string;       // key into FEATURES, or omit to use a tag expression
  tags?: string;          // cucumber tag expression
  paths?: string[];       // explicit feature paths (overrides feature lookup)
}

const VALIDATION_TAGS =
  '@ui or @functional or @navigation or @api or @device or @permission or ' +
  '@network or @security or @performance or @notification or @interruption or @localization';

const SEQUENCE: SequenceStep[] = [
  { label: 'payTo',              feature: 'payTo' },
  { label: 'validation-after-payTo',         tags: VALIDATION_TAGS,
    paths: ['src/test/resources/features/validation'] },
  { label: 'requestMoney',       feature: 'requestMoney' },
  { label: 'validation-after-requestMoney',  tags: VALIDATION_TAGS,
    paths: ['src/test/resources/features/validation'] },
  { label: 'merchant',           feature: 'merchant' },
  { label: 'validation-after-merchant',      tags: VALIDATION_TAGS,
    paths: ['src/test/resources/features/validation'] },
  { label: 'myanmarPayPersonal', feature: 'myanmarPayPersonal' },
  { label: 'myanmarPayHistory',  feature: 'myanmarPayHistory' },
  { label: 'validation-after-myanmarPay',    tags: VALIDATION_TAGS,
    paths: ['src/test/resources/features/validation'] },
  { label: 'electricity',        feature: 'electricity' },
  { label: 'validation-after-electricity',   tags: VALIDATION_TAGS,
    paths: ['src/test/resources/features/validation'] },
  { label: 'recentTransactions', feature: 'recentTransactions' },
  { label: 'validation-after-recentTransactions', tags: VALIDATION_TAGS,
    paths: ['src/test/resources/features/validation'] },
];

function getFeaturePath(name: string): string {
  const featurePath = FEATURES[name];
  if (!featurePath) {
    throw new Error(
      `Unknown feature "${name}". Available: ${Object.keys(FEATURES).join(', ')}`,
    );
  }
  return featurePath;
}

interface StepResult {
  label: string;
  status: 'passed' | 'failed';
  exitCode: number;
}

/**
 * Run one cucumber-js invocation, tee its output to the shared run-log fd
 * (one log per runner invocation - never one per feature), and resolve
 * when the child exits. The caller owns the file lifecycle.
 */
function runOnce(opts: {
  label: string;
  feature?: string;
  tags?: string;
  paths?: string[];
  parallel: number;
  retry?: number;
  profile?: string;
  logFd: number;
}): Promise<StepResult> {
  return new Promise(resolve => {
    // Always use an isolated profile so the runner is the single source of
    // truth for paths/tags. Without this, cucumber-js's default profile path
    // glob ('**/*.feature') runs every feature regardless of what we passed
    // via --feature, which would make per-step logs meaningless.
    const profile = opts.profile ?? 'isolated';
    const cmdArgs = ['cucumber-js', '--config', 'cucumber.config.js', '--profile', profile];
    if (opts.feature) cmdArgs.push(getFeaturePath(opts.feature));
    if (opts.paths) cmdArgs.push(...opts.paths);
    // shell: true re-tokenizes the args; multi-word tag expressions like
    // "@ui or @functional" would be split. Quote the value to keep it intact.
    if (opts.tags) cmdArgs.push('--tags', `"${opts.tags}"`);
    if (opts.parallel > 1) cmdArgs.push('--parallel', String(opts.parallel));
    if (opts.retry) cmdArgs.push('--retry', String(opts.retry));

    const startedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    const sectionHeader = [
      '',
      '-'.repeat(72),
      `STEP: ${opts.label}`,
      '-'.repeat(72),
      `Started:   ${startedAt} IST`,
      `Feature:   ${opts.feature ?? (opts.paths ? opts.paths.join(', ') : '(all)')}`,
      `Tags:      ${opts.tags ?? '(none)'}`,
      `Parallel:  ${opts.parallel} device(s)`,
      `Command:   npx ${cmdArgs.join(' ')}`,
      '-'.repeat(72),
      '',
    ].join('\n');
    try { fs.writeSync(opts.logFd, sectionHeader); } catch { /* ignore */ }

    console.log(`[runner] step=${opts.label} feature=${opts.feature ?? '-'} ` +
      `tags="${opts.tags ?? '(none)'}" parallel=${opts.parallel}`);
    console.log(`[runner] npx ${cmdArgs.join(' ')}`);

    const child = spawn('npx', cmdArgs, { shell: true });
    const tee = (chunk: Buffer, stream: NodeJS.WriteStream) => {
      stream.write(chunk);
      try { fs.writeSync(opts.logFd, stripAnsi(chunk.toString())); } catch { /* ignore */ }
    };
    child.stdout.on('data', (c: Buffer) => tee(c, process.stdout));
    child.stderr.on('data', (c: Buffer) => tee(c, process.stderr));

    child.on('close', (code) => {
      const finishedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
      const finalStatus: 'passed' | 'failed' = code === 0 ? 'passed' : 'failed';
      const sectionFooter = [
        '',
        `Finished:  ${finishedAt} IST   Status: ${finalStatus}   Exit code: ${code ?? 1}`,
        '',
      ].join('\n');
      try { fs.writeSync(opts.logFd, sectionFooter); } catch { /* ignore */ }
      resolve({ label: opts.label, status: finalStatus, exitCode: code ?? 1 });
    });
  });
}

function generateHtmlReport(): void {
  console.log('[runner] generating HTML report');
  spawnSync('node', ['src/test/ts/reporting/generate-report.js'],
    { stdio: 'inherit', shell: true });
}

/** Open the single run-log file and write its run-level header. */
function openRunLog(invocation: string): { logFd: number; runningPath: string; startTs: string } {
  const startTs = istTimestamp();
  const runningPath = buildRunLogPath('running', startTs);
  const logFd = fs.openSync(runningPath, 'w');
  const startedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  const header = [
    '='.repeat(72),
    'Appium Test Run',
    '='.repeat(72),
    `Started:    ${startedAt} IST`,
    `Invocation: ${invocation}`,
    '='.repeat(72),
    '',
  ].join('\n');
  fs.writeSync(logFd, header);
  console.log(`[runner] log: ${path.relative(process.cwd(), runningPath)}`);
  return { logFd, runningPath, startTs };
}

/** Close the run-log and rename it to reflect the aggregate status. */
function closeRunLog(
  logFd: number,
  runningPath: string,
  startTs: string,
  results: StepResult[],
): string {
  const anyFailed = results.some(r => r.status !== 'passed');
  const finalStatus = anyFailed ? 'failed' : 'passed';
  const finishedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  const summaryLines = [
    '',
    '='.repeat(72),
    'Run Summary',
    '='.repeat(72),
    ...results.map(r => `  ${r.status === 'passed' ? '✓' : '✗'} ${r.label.padEnd(40)} ${r.status} (exit ${r.exitCode})`),
    '',
    `Finished:   ${finishedAt} IST`,
    `Status:     ${finalStatus}`,
    `Steps:      ${results.length}`,
    '='.repeat(72),
    '',
  ].join('\n');
  try { fs.writeSync(logFd, summaryLines); fs.closeSync(logFd); } catch { /* ignore */ }
  const finalPath = buildRunLogPath(finalStatus, startTs);
  try { fs.renameSync(runningPath, finalPath); } catch { return runningPath; }
  return finalPath;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); return 0; }

  const parallel = args.parallel ?? 1;
  if (parallel > ANDROID_DEVICES.length) {
    console.error(
      `Requested --parallel ${parallel} but only ${ANDROID_DEVICES.length} ` +
      `device slot(s) configured in runner.ts.`,
    );
    return 2;
  }

  // Sweep stray top-level logs/XMLs once, before the whole run; target/logs/
  // is preserved so per-run logs accumulate across executions.
  cleanTargetForFreshRun();

  const invocation = process.argv.slice(2).join(' ') || '(default)';
  const { logFd, runningPath, startTs } = openRunLog(invocation);
  const results: StepResult[] = [];

  try {
    if (args.sequence) {
      const steps = args.skipValidation
        ? SEQUENCE.filter(s => !s.label.startsWith('validation-'))
        : SEQUENCE;
      if (args.skipValidation) {
        console.log(`[runner] --skip-validation: dropping ${SEQUENCE.length - steps.length} validation steps`);
      }
      // Flows-only mode: use isolatedFlows profile so reports + validation step
      // files aren't loaded — they'd otherwise cause step-definition ambiguity
      // with the central myanmarPayHistory dispatcher.
      const profile = args.skipValidation ? 'isolatedFlows' : 'isolated';
      for (const step of steps) {
        const r = await runOnce({
          label: step.label,
          feature: step.feature,
          tags: step.tags,
          paths: step.paths,
          parallel,
          retry: args.retry,
          profile,
          logFd,
        });
        results.push(r);
        // Continue through remaining steps even if one fails — the user
        // wants the full flow logged. The aggregate exit code reflects
        // whether any step failed.
      }
    } else {
      const r = await runOnce({
        label: args.feature ?? args.tags ?? 'all',
        feature: args.feature,
        tags: args.tags,
        parallel,
        retry: args.retry,
        logFd,
      });
      results.push(r);
    }
  } finally {
    const finalLogPath = closeRunLog(logFd, runningPath, startTs, results);
    console.log(`[runner] log saved: ${path.relative(process.cwd(), finalLogPath)}`);
  }

  generateHtmlReport();
  if (args.sequence) {
    console.log('');
    console.log('='.repeat(72));
    console.log('Sequence summary');
    console.log('='.repeat(72));
    for (const r of results) {
      console.log(`  ${r.status === 'passed' ? '✓' : '✗'} ${r.label.padEnd(40)} ${r.status}`);
    }
  }
  const anyFailed = results.some(r => r.status !== 'passed');
  return anyFailed ? 1 : (results[0]?.exitCode ?? 0);
}

// Only execute when invoked directly, not when imported by driverManager.
if (require.main === module) {
  main().then(code => process.exit(code)).catch(err => {
    console.error('[runner] fatal:', err);
    process.exit(1);
  });
}
