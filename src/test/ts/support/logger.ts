/**
 * logger - the single home for ALL run-logging concerns.
 *
 * Everything about HOW the suite writes/formats logs lives here, so the runner
 * stays focused purely on EXECUTION (arg parsing, spawning cucumber-js,
 * sequencing) and the hooks/pages stay focused on test behaviour. If you want
 * to change anything about the log - file name, headers, the per-step section,
 * output cleaning, the run summary, or the popup banner - this is the only file
 * you touch.
 *
 * Two groups of exports:
 *   1. Run-log file lifecycle (used by the runner):
 *        openRunLog -> writeStepSectionHeader / writeStepSectionFooter (per step)
 *        -> cleanForLog (on teed output) -> closeRunLog
 *   2. In-test log banners (used by hooks/pages):
 *        logPopupHandled - a highly-visible, uniquely-greppable popup banner.
 */

import * as path from 'path';
import * as fs from 'fs';

// =============================================================================
// Paths
// =============================================================================

const TARGET_DIR = path.resolve('target');
export const LOGS_DIR = path.join(TARGET_DIR, 'logs');
const DIAGNOSTICS_DIR = path.join(TARGET_DIR, 'diagnostics');

/*
 * Prepare target/ for a fresh run: ensure the logs dir exists and wipe stale
 * page-source dumps from the previous run (target/logs/ itself is preserved so
 * per-run logs accumulate across runs).
 */
export function prepareTargetDirs(): void {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  try { fs.rmSync(DIAGNOSTICS_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
}

// =============================================================================
// Types
// =============================================================================

/** Result of one cucumber-js invocation; consumed by the run summary. */
export interface StepResult {
  label: string;
  status: 'passed' | 'failed';
  exitCode: number;
}

/**
 * One (device, feature) pairing in assigned mode: the feature a device owns,
 * run as a SINGLE cucumber process whose Examples table was expanded to
 * `count` cycles. Devices run their lanes concurrently; a device with several
 * lanes works through them in order.
 */
export interface Lane {
  workerId: number;
  udid: string;
  /** The source feature under src/ — what the log reports. */
  featurePath: string;
  /** The expanded copy under target/generated/ — what cucumber actually ran. */
  runPath: string;
  featureName: string;
  /** Cycles per batch (--count). A plain run is a single batch. */
  count: number;
  /**
   * One cucumber JSON fragment per batch.
   *
   * A --duration soak runs the lane as repeated batches (one cucumber process,
   * one Appium session each) until the deadline, so the tally has to be summed
   * across all of them rather than read from a single file.
   */
  reportJsons: string[];
  /** One entry per batch, in order, as each process exits. */
  results: DeviceRunResult[];
  /** Why the lane stopped — shown in the roll-up. */
  stoppedBecause?: 'count' | 'duration' | 'failure';
}

// =============================================================================
// Timestamps
// =============================================================================

/** Human-readable IST wall-clock for headers/footers. */
function nowIst(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
}

/** Filesystem-safe IST timestamp for the log filename (no spaces/colons). */
export function istTimestamp(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}_${get('hour')}-${get('minute')}-${get('second')}`;
}

function buildRunLogPath(timestamp: string): string {
  return path.join(LOGS_DIR, `Appium_${timestamp}.log`);
}

// =============================================================================
// Output cleaning
// =============================================================================

/** ANSI escape codes pollute log files - strip them before persisting. */
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Clean teed cucumber output before it is persisted to the run log:
 *   - strip ANSI colour codes
 *   - drop cucumber's " # path/to/steps.ts:NN" step-definition locations, which
 *     are noise in a human-readable log (the step text alone reads cleanly).
 * The live console still shows the raw output; only the log file is cleaned.
 */
export function cleanForLog(s: string): string {
  return stripAnsi(s).replace(/ # \S+:\d+/g, '');
}

/** Append teed child output to the run log (ANSI + step-location cleaned). */
export function appendToLog(logFd: number, raw: string): void {
  try { fs.writeSync(logFd, cleanForLog(raw)); } catch { /* ignore */ }
}

// =============================================================================
// Run-log file lifecycle
// =============================================================================

/** Open the single run-log file (no run-level header — each feature writes its
 *  own TEST EXECUTION LOG block via writeFeatureHeader). */
export function openRunLog(): { logFd: number; logPath: string } {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const logPath = buildRunLogPath(istTimestamp());
  const logFd = fs.openSync(logPath, 'w');
  console.log(`[runner] log: ${path.relative(process.cwd(), logPath)}`);
  return { logFd, logPath };
}

// Running counters for the log, reset per run by writeRunHeader().
let executionNo = 0;      // how many TEST EXECUTION LOG blocks written so far
let cyclesSoFar = 0;      // cycles accumulated across those blocks
let plannedExecutions = 0;  // blocks expected (lanes), 0 = unknown
let plannedCycles = 0;      // cycles expected in total, 0 = unknown

/** Marker that closeRunLog() swaps for the OVERALL SUCCESS RATIO block. */
const OVERALL_PLACEHOLDER =
  '(overall success ratio: run did not complete — no summary written)';
/** Filled in by writeAssignedLog once every lane has reported. */
let overallSummary = '';

/**
 * Write the run banner at the top of the log: what was asked for, and the
 * totals to measure progress against.
 *
 * The per-feature blocks that follow each carry "Execution No : n of N" and a
 * running "Total Count", so a long soak can be read top-to-bottom and you can
 * always see how far through it you are — previously every block looked alike
 * and only the timestamps distinguished them.
 */
export function writeRunHeader(logFd: number, info: {
  platform: string;
  hostOs: string;
  deviceCount: number;
  featureCount: number;
  cyclesEach: number;
  /** Present for a --duration soak, where the cycle total is not known upfront. */
  durationLabel?: string;
  invocation: string;
}): void {
  executionNo = 0;
  cyclesSoFar = 0;
  plannedExecutions = info.featureCount;
  // A soak has no fixed cycle count — it runs until the clock stops it — so the
  // "of N" suffix is deliberately omitted rather than shown as a wrong number.
  plannedCycles = info.durationLabel ? 0 : info.featureCount * info.cyclesEach;

  const bar = '='.repeat(80);
  const block = [
    bar,
    'APPIUM TEST RUN',
    bar,
    '',
    `Started         : ${nowIst()} IST`,
    `Platform        : ${info.platform}   (host: ${info.hostOs})`,
    `Devices         : ${info.deviceCount}`,
    `Features        : ${info.featureCount}`,
    info.durationLabel
      ? `Duration        : ${info.durationLabel}  (cycles per batch: ${info.cyclesEach})`
      : `Cycles Each     : ${info.cyclesEach}`,
    info.durationLabel
      ? 'Total Count     : until the time budget is spent'
      : `Total Count     : ${plannedCycles}`,
    `Invocation      : ${info.invocation}`,
    '',
    bar,
    '',
    // Section 2 of the log. The run's outcome cannot be written yet, so this
    // marker holds the place and closeRunLog() swaps the finished OVERALL
    // SUCCESS RATIO block in — giving the file the order
    //   1. APPIUM TEST RUN  2. OVERALL SUCCESS RATIO  3. TEST EXECUTION LOG…
    // so the result is read before scrolling through thousands of step lines.
    // A killed run keeps the marker, which honestly says no summary exists
    // rather than showing a ratio from partial results.
    OVERALL_PLACEHOLDER,
    '',
  ].join('\n');
  try { fs.writeSync(logFd, block); } catch { /* ignore */ }
}

/**
 * Write one feature's "TEST EXECUTION LOG" header block. Written once per
 * feature AFTER it runs (so Status is known); in a multi-feature run each
 * feature gets its own block, in order, in the same file — the first feature's
 * block in full, then the next feature's block below it, and so on.
 */
function writeFeatureHeader(logFd: number, info: {
  featureName: string;
  scenarioName: string;
  executionType: string;
  status: 'passed' | 'failed';
  /** Cycles this block covers — added to the run-wide running total. */
  cycles?: number;
}): void {
  // Running execution number across the whole log: block 1, 2, 3, ... Without
  // it, a multi-feature or repeated run produces near-identical blocks and
  // there is no way to tell how far in you are when scrolling the file.
  executionNo += 1;
  cyclesSoFar += info.cycles ?? 1;

  const block = [
    '',
    '='.repeat(80),
    `TEST EXECUTION LOG  —  EXECUTION ${executionNo}`,
    '='.repeat(80),
    '',
    `Execution No    : ${executionNo}${plannedExecutions ? ` of ${plannedExecutions}` : ''}`,
    `Execution Date  : ${nowIst()}`,
    `Feature File    : ${info.featureName}`,
    `Scenario Name   : ${info.scenarioName}`,
    `Execution Type  : ${info.executionType}`,
    `Cycles In Block : ${info.cycles ?? 1}`,
    `Total Count     : ${cyclesSoFar}${plannedCycles ? ` of ${plannedCycles}` : ''}`,
    `Status          : ${info.status === 'passed' ? 'Passed' : 'Failed'}`,
    '',
  ].join('\n');
  try { fs.writeSync(logFd, block); } catch { /* ignore */ }
}

/**
 * Write the END OF LOG terminator (once, after every feature block) and close
 * the run-log. Each feature already records its own Status in its TEST EXECUTION
 * LOG header and each device its own RESULT, so no aggregate summary is needed.
 */
export function closeRunLog(logFd: number, logPath: string): string {
  const bar = '='.repeat(80);
  const footer = ['', '', bar, 'END OF LOG', bar, ''].join('\n');
  try { fs.writeSync(logFd, footer); fs.closeSync(logFd); } catch { /* ignore */ }

  // Backfill the run's outcome into the TOP header. It cannot be written when
  // the header goes out (the run has not happened yet), so the placeholder is
  // swapped here — a reader then sees the result immediately instead of
  // scrolling past every execution block to find it.
  if (overallSummary) {
    try {
      const text = fs.readFileSync(logPath, 'utf8');
      fs.writeFileSync(logPath, text.replace(OVERALL_PLACEHOLDER, overallSummary));
    } catch { /* the log is still valid without the backfill */ }
    overallSummary = '';
  }
  return logPath;
}

// =============================================================================
// Per-feature log composition
// -----------------------------------------------------------------------------
// ALL log formatting/parsing lives here. The runner only spawns one cucumber
// process per device and hands their captured output to writeFeatureLog(); this
// file owns the header, the per-device blocks, the RESULT footer, the cleaning
// of cucumber's own noise, and the feature/scenario/execution-type wording.
// =============================================================================

/** One device's captured run, handed from the runner for formatting. */
export interface DeviceRunResult {
  workerId: number;
  output: string;   // raw captured stdout/stderr
  exitCode: number;
  durationMs: number;
}

// Cucumber's own end-of-run summary + the report-writer chatter — stripped so
// each device block ends right after its step trace + RESULT footer.
const CUCUMBER_TAIL: readonly RegExp[] = [
  /^\s*\d+ scenarios?\b/,                      // "1 scenario (1 passed)"
  /^\s*\d+ steps?\b/,                          // "14 steps (14 passed)"
  /^\s*\d+m[\d.]+s \(executing steps/,         // "1m16.977s (executing steps: ...)"
  /^\s*[\d.]+s \(executing steps/,             // "13.4s (executing steps: ...)"
  /^\[generate-report\]/,                      // report-writer warning lines
  /^HTML report written\b/,
  /^Excel report\b/,
  /^\s*\d+ passed \| \d+ failed \| \d+ skipped/, // custom "x passed | y failed | ..." summary
];

/** Strip cucumber's trailing summary/report lines, leaving just the step trace. */
function stripCucumberTail(output: string): string {
  return cleanForLog(output)
    .split('\n')
    .filter(line => !CUCUMBER_TAIL.some(re => re.test(line)))
    .join('\n')
    .trimEnd();
}

/** The clean RESULT footer for one device/scenario run (replaces the tail). */
function resultBlock(passed: boolean, durationMs: number): string {
  const dash = '-'.repeat(80);
  return [
    '',
    dash,
    'RESULT',
    dash,
    '',
    `Scenario Status : ${passed ? 'PASSED' : 'FAILED'}`,
    `Execution Time  : ${(durationMs / 1000).toFixed(3)} Seconds`,
    '',
  ].join('\n');
}

/** The human-readable name from the feature's `Feature:` line (not the path). */
export function featureNameFromFile(featurePath: string): string {
  try {
    const m = fs.readFileSync(featurePath, 'utf8').match(/^\s*Feature:\s*(.+?)\s*$/m);
    if (m) return m[1].trim();
  } catch { /* ignore */ }
  return featurePath.replace(/\\/g, '/').split('/').pop()!.replace(/\.feature$/, '');
}

/** The scenario name(s) actually executed, read from the captured step trace
 *  ("──── Scenario: <name> ────"); falls back to the feature's declared names. */
function scenarioNames(outputs: string[], featurePath: string): string {
  const names = new Set<string>();
  for (const out of outputs) {
    for (const m of out.matchAll(/─+\s*Scenario:\s*(.+?)\s*─+/g)) names.add(m[1].trim());
  }
  if (names.size === 0) {
    try {
      for (const m of fs.readFileSync(featurePath, 'utf8')
        .matchAll(/^\s*Scenario(?: Outline)?:\s*(.+?)\s*$/gm)) names.add(m[1].trim());
    } catch { /* ignore */ }
  }
  return names.size ? [...names].join('; ') : '(unknown)';
}

/** Execution-type wording from the device count used for this feature. */
function executionTypeLabel(deviceCount: number): string {
  if (deviceCount === 1) return 'Single Device Execution';
  if (deviceCount === 2) return 'Parallel Execution';
  return 'Multiple Device Execution';
}

/**
 * Compose and write ONE feature's full log section: the TEST EXECUTION LOG
 * header, then each device's block (clean step trace + RESULT footer). Prints
 * the grouped device blocks to the console too (for a parallel run they were
 * not streamed live). Returns the feature's StepResult.
 */
export function writeFeatureLog(logFd: number, info: {
  featurePath: string;
  deviceCount: number;
  deviceLabels: string[];
  results: DeviceRunResult[];
}): StepResult {
  const { featurePath, deviceCount, deviceLabels } = info;
  const results = [...info.results].sort((a, b) => a.workerId - b.workerId);
  const anyFailed = results.some(r => r.exitCode !== 0);
  const status: 'passed' | 'failed' = anyFailed ? 'failed' : 'passed';

  writeFeatureHeader(logFd, {
    featureName: featureNameFromFile(featurePath),
    scenarioName: scenarioNames(results.map(r => r.output), featurePath),
    executionType: executionTypeLabel(deviceCount),
    status,
  });

  if (deviceCount === 1) {
    // Single device already streamed live to the console; persist the clean
    // trace + RESULT to the log (no DEVICE header — there is only one).
    const r = results[0];
    const block = `${stripCucumberTail(r.output)}\n${resultBlock(r.exitCode === 0, r.durationMs)}`;
    try { fs.writeSync(logFd, block); } catch { /* ignore */ }
  } else {
    const bar = '═'.repeat(80);
    for (const r of results) {
      const label = deviceLabels[r.workerId] ? `  (${deviceLabels[r.workerId]})` : '';
      const block =
        `\n${bar}\n  DEVICE ${r.workerId + 1}${label}\n${bar}\n` +
        `${stripCucumberTail(r.output)}\n${resultBlock(r.exitCode === 0, r.durationMs)}`;
      process.stdout.write(block);
      try { fs.writeSync(logFd, block); } catch { /* ignore */ }
    }
  }

  return { label: featurePath, status, exitCode: anyFailed ? 1 : 0 };
}

// =============================================================================
// Assigned-mode log composition
// -----------------------------------------------------------------------------
// Assigned mode (--assign) pairs each device with its OWN feature, and --count
// expands that feature's template row so the device runs N cycles inside ONE
// cucumber process. The pinned-mode layout (one feature, devices side by side)
// therefore does not fit: what matters here is, per device, how many of its N
// cycles passed.
//
// Each lane gets its own TEST EXECUTION LOG block containing the FULL step
// trace — every cycle, passed and failed alike, exactly as a normal run logs
// it — followed by that device's cycle tally and success ratio, and finally the
// cross-device overall ratio. The tally is read back from the lane's cucumber
// JSON fragment, which is the only place per-scenario results are recorded once
// all the cycles share a single process.
// =============================================================================

/** Per-cycle outcome for one lane, counted from its cucumber JSON fragment. */
interface CycleTally {
  total: number;
  passed: number;
  failed: number;
  /** Cycle numbers that failed, in order — enough to spot a pattern. */
  failedAt: number[];
}

/**
 * Count passed/failed scenarios in a lane's cucumber JSON. A scenario counts as
 * failed if ANY of its steps failed. Returns zeroed counts when the fragment is
 * missing or unreadable (a device that died before cucumber wrote anything) —
 * the step trace in the log is then the only record, which is the honest
 * outcome rather than a fabricated tally.
 */
function cycleTally(reportJsons: string[]): CycleTally {
  const tally: CycleTally = { total: 0, passed: 0, failed: 0, failedAt: [] };
  // Summed across batches, in order, so the cycle numbers keep counting up
  // across a --duration soak instead of restarting at 1 for every batch.
  for (const reportJson of reportJsons) addBatchToTally(tally, reportJson);
  return tally;
}

function addBatchToTally(tally: CycleTally, reportJson: string): void {
  let features: unknown;
  try {
    const file = path.isAbsolute(reportJson) ? reportJson : path.resolve(reportJson);
    const text = fs.readFileSync(file, 'utf8').trim();
    if (!text) return;
    features = JSON.parse(text);
  } catch {
    return;
  }
  if (!Array.isArray(features)) return;

  for (const feature of features) {
    const elements = (feature as { elements?: unknown[] })?.elements;
    if (!Array.isArray(elements)) continue;
    for (const scenario of elements) {
      const steps = (scenario as { steps?: unknown[] })?.steps;
      if (!Array.isArray(steps) || steps.length === 0) continue;
      tally.total++;
      const failed = steps.some(
        s => (s as { result?: { status?: string } })?.result?.status === 'failed',
      );
      if (failed) {
        tally.failed++;
        tally.failedAt.push(tally.total);
      } else {
        tally.passed++;
      }
    }
  }
}


/** Why the lane stopped, in words — the headline fact for a soak run. */
function stopReasonLabel(lane: Lane): string {
  switch (lane.stoppedBecause) {
    case 'failure':  return 'a cycle FAILED (--until-failure)';
    case 'duration': return 'the time budget ran out';
    default:         return 'the requested cycles completed';
  }
}

/** The lane's roll-up: cycle tally, ratio and timing — its success ratio. */
function laneSummary(lane: Lane, tally: CycleTally): string {
  const durationMs = lane.results.reduce((a, r) => a + r.durationMs, 0);
  const ratio = tally.total ? ((tally.passed / tally.total) * 100).toFixed(1) : '0.0';
  const avg = tally.total ? durationMs / tally.total : 0;
  const dash = '-'.repeat(80);

  const failedList = tally.failedAt.length
    ? tally.failedAt.slice(0, 20).join(', ') + (tally.failedAt.length > 20 ? ', ...' : '')
    : 'none';

  return [
    '',
    dash,
    'RESULT',
    dash,
    '',
    `Device          : ${lane.workerId + 1}  (${lane.udid})`,
    `Feature         : ${lane.featureName}`,
    `Cycles          : ${tally.total} executed`,
    `Stopped Because : ${stopReasonLabel(lane)}`,
    `Passed          : ${tally.passed}`,
    `Failed          : ${tally.failed}`,
    `Failed Cycles   : ${failedList}`,
    `Success Ratio   : ${ratio}%`,
    `Average Cycle   : ${(avg / 1000).toFixed(3)} Seconds`,
    `Total Time      : ${(durationMs / 1000).toFixed(3)} Seconds`,
    '',
  ].join('\n');
}

/**
 * Write the full assigned-mode log: one TEST EXECUTION LOG block per lane
 * (device + its feature) with the complete step trace for every cycle and that
 * device's roll-up, then the cross-device overall ratio.
 */
export function writeAssignedLog(logFd: number, info: {
  lanes: Lane[];
  count: number;
  deviceCount: number;
}): void {
  const { lanes, count, deviceCount } = info;
  const bar = '═'.repeat(80);

  // Kept in the order the features were given, NOT sorted by device. One
  // feature's cycles are already contiguous (a lane owns a whole feature), so
  // this makes the log read feature-by-feature — all of Business Profile's
  // runs, then all of Personal Profile's — instead of interleaving by whichever
  // device happened to own them.
  const ordered = [...lanes];

  const tallies = new Map<Lane, CycleTally>();

  for (const lane of ordered) {
    const tally = cycleTally(lane.reportJsons);
    tallies.set(lane, tally);
    // Every batch's trace, in order — a soak's later batches are where the
    // interesting failures live, so none of them are dropped.
    const outputs = lane.results.map(r => r.output);
    const passed = lane.results.length > 0 && lane.results.every(r => r.exitCode === 0);

    writeFeatureHeader(logFd, {
      featureName: lane.featureName,
      scenarioName: scenarioNames(outputs, lane.featurePath),
      executionType: `Assigned Execution — device ${lane.workerId + 1} of ${deviceCount}, ` +
        `${count} cycle(s) per batch`,
      // Actual cycles this lane ran, not the requested figure: a soak lane
      // stops on the clock and a --until-failure lane stops early, so the
      // running total must reflect what really executed.
      cycles: tally.total || lane.results.length,
      status: passed ? 'passed' : 'failed',
    });

    const block =
      `\n${bar}\n  DEVICE ${lane.workerId + 1}  (${lane.udid})  —  ${lane.featureName}\n${bar}\n` +
      `\n${outputs.map(stripCucumberTail).join('\n')}\n` +
      laneSummary(lane, tally);
    process.stdout.write(block);
    try { fs.writeSync(logFd, block); } catch { /* ignore */ }
  }

  // Cross-device total — the headline success ratio for the whole run.
  const total = ordered.reduce((a, l) => a + (tallies.get(l)?.total ?? 0), 0);
  const passed = ordered.reduce((a, l) => a + (tallies.get(l)?.passed ?? 0), 0);
  const ratio = total ? ((passed / total) * 100).toFixed(1) : '0.0';
  const overall = [
    '',
    bar,
    '  OVERALL SUCCESS RATIO',
    bar,
    '',
    `Devices         : ${deviceCount}`,
    `Features        : ${ordered.length}`,
    `Cycles Each     : ${count}`,
    `Total Cycles    : ${total}`,
    `Passed          : ${passed}`,
    `Failed          : ${total - passed}`,
    `Success Ratio   : ${ratio}%`,
    '',
  ].join('\n');
  // Console only. The same block is placed at the TOP of the log file by
  // closeRunLog() — writing it here as well would duplicate it, and the whole
  // point is that the result is visible without scrolling to the end.
  process.stdout.write(overall);
  overallSummary = overall.replace(/^\n+/, '');
}

// =============================================================================
// In-test logging
// =============================================================================

/**
 * Emit one in-test log line (a step result or popup note) to stdout.
 *
 * The runner runs ONE cucumber process per device (deterministic device→example
 * pinning), so a process's stdout IS that one device's output — the runner
 * captures each process separately and writes the devices as grouped blocks
 * (Device 1 in full, then Device 2, ...). There is therefore no cross-device
 * interleaving to untangle here: a plain console.log is all that's needed, and
 * no per-device buffer files (the old target/logs/.parallel) are created.
 */
export function deviceLog(line: string): void {
  console.log(line);
}

/**
 * Log a popup the framework auto-handled — a clean, single-line, greppable
 * entry ("POPUP HANDLED") that sits inline with its device's step trace.
 */
export function logPopupHandled(detail: string): void {
  console.log(`   ⚠⚠ POPUP HANDLED — ${detail}`);
}
