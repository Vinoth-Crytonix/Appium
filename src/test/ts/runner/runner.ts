/**
 * runner - minimal feature executor.
 *
 * Responsibility is ONLY execution: parse the feature path(s), decide how many
 * devices to use, spawn one cucumber-js process per device, and hand the
 * captured output to the logger. It contains NO log formatting/parsing - that
 * all lives in support/logger.ts (writeFeatureLog / writeAssignedLog).
 *
 * THREE WAYS TO RUN — all supported
 * --------------------------------
 * 1. Normal single run (default):
 *      ts-node runner.ts <feature>
 *    One feature, on the connected device, live console output.
 *
 * 2. Pinned examples across devices (default when >1 device, or --parallel N):
 *      ts-node runner.ts [--parallel N] <feature> [<feature> ...]
 *    ONE feature spread across N devices - each device runs a DIFFERENT
 *    `Examples` row, pinned by the @second-device/@third-device tags. Several
 *    feature paths run one after another.
 *
 * 3. Assigned mode (--assign) — used by the securityLayer suite:
 *      ts-node runner.ts --assign <feature1> <feature2> ...
 *    A DIFFERENT feature per device, all devices running CONCURRENTLY. Feature i
 *    goes to device i; with more features than connected devices they are dealt
 *    round-robin and each device works through its queue in order. The
 *    per-example device tags are NOT applied here - every device runs its whole
 *    feature.
 *
 * LOOPING — `--count N`
 * ---------------------
 * Any of the three modes takes `--count N` to run a feature's cycle N times:
 *
 *      ts-node runner.ts --assign --count 100 <feature1> <feature2>
 *
 * The feature keeps ONE template `Examples` row; the runner expands it to N rows
 * into target/generated/ and runs that copy (see runner/featureCount.ts). All N
 * cycles therefore execute inside ONE cucumber process and ONE Appium session —
 * the session start-up cost is paid once, not N times. The source feature under
 * src/ is never modified.
 *
 * Everything that is NOT "execute a feature" lives elsewhere:
 *   - device capabilities -> resources/config/android.caps.json (read by DriverManager)
 *   - all log formatting   -> support/logger.ts
 *   - example expansion    -> runner/featureCount.ts
 *
 * Examples:
 *   ts-node src/test/ts/runner/runner.ts src/test/resources/features/payTo/payTo.feature
 *   ts-node src/test/ts/runner/runner.ts --parallel 2 src/test/resources/features/validation
 *   ts-node src/test/ts/runner/runner.ts --assign --count 100 \
 *     src/test/resources/features/securityLayer/voucherLogin.feature \
 *     src/test/resources/features/securityLayer/sessionTimeout.feature
 */

import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {
  prepareTargetDirs,
  openRunLog,
  closeRunLog,
  writeFeatureLog,
  writeAssignedLog,
  writeRunHeader,
  featureNameFromFile,
  type DeviceRunResult,
  type StepResult,
  type Lane,
} from '../support/logger';
import { availableUdids } from '../support/devices';
import { assertPlatformSupported, targetPlatform, usesAdb } from '../support/platform';
import { expandFeature, GENERATED_DIR } from './featureCount';

// Per-example device tags. Device 1 (worker 0) runs example 1 — the rows tagged
// for NO other device; device N (worker i) runs the @<ordinal>-device rows. This
// pins each example to a fixed device deterministically, instead of leaving the
// example→device pairing to cucumber's non-deterministic --parallel queue.
// PINNED MODE ONLY — assigned mode runs whole features per device.
const DEVICE_ORDINALS = ['second', 'third', 'fourth', 'fifth', 'sixth'] as const;

/** Where per-device cucumber JSON is written before being merged. */
const REPORTS_DIR = path.resolve('target', 'reports');

/** Default Appium port; --server-per-device counts up from here. */
const DEFAULT_APPIUM_PORT = 4723;

/** Cycles per batch when --duration is driving the run and --count is absent. */
const DEFAULT_BATCH_CYCLES = 25;

/**
 * Parse a soak duration: "5h", "90m", "3600s", or a bare number of minutes.
 * Returns milliseconds, or 0 when nothing was asked for.
 */
export function parseDuration(spec: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*([hms]?)$/i.exec(spec.trim());
  if (!m) return 0;
  const value = Number(m[1]);
  const unit = (m[2] || 'm').toLowerCase();
  const factor = unit === 'h' ? 3_600_000 : unit === 's' ? 1_000 : 60_000;
  return Math.round(value * factor);
}

/** "1h 04m" / "6m 12s" — for the run's progress lines. */
function humanMs(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

// Set once from the CLI in main(); read by the spawn helpers below. Module
// state rather than threaded parameters — every call site wants the same two
// values and they never change during a run.
let serverPerDevice = false;
let appiumBasePort = DEFAULT_APPIUM_PORT;
/** --until-failure: stop a lane at its first failing cycle. */
let stopOnFailure = false;
/**
 * --retry N: re-run a failed cycle from a clean start, up to N times.
 *
 * Aimed at ONE specific failure: over wireless adb (`_adb-tls-connect._tcp`) a
 * brief Wi-Fi drop kills the UiAutomator2 instrumentation, and every command in
 * the cycle then fails with "instrumentation process is not running". That is a
 * transport fault, not a defect in the app or the script — measured at 4 session
 * deaths in 40 cycles, which cost 2 cycles outright.
 *
 * Recovering mid-scenario cannot save those cycles: rebuilding the session
 * relaunches the app, so the flow resumes on Home half-way through and fails
 * anyway. Re-running the whole scenario CAN, because the Before hook rebuilds
 * the session and starts from Home.
 *
 * Default 0 — a retry that hides a real defect is worse than a visible failure.
 */
let retries = 0;
/** --duration: keep re-running each lane in batches until this budget is spent. */
let soakMs = 0;

/**
 * The Appium server for a device slot when --server-per-device is on:
 * worker 0 -> 4723, worker 1 -> 4724, ...
 *
 * One server per device is what makes concurrent runs reliable on this suite.
 * A single server serialises session creation, and a device whose session start
 * queues behind another's can blow cucumber's BeforeAll timeout and lose the
 * whole lane before it runs a step. Start the servers first:
 *     npx appium --port 4723
 *     npx appium --port 4724
 */
function appiumUrlFor(workerId: number, basePort: number): string {
  return `http://127.0.0.1:${basePort + workerId}/`;
}

/** Tag expression selecting the example pinned to device slot `workerId`. */
function tagForDevice(workerId: number): string {
  if (workerId === 0) {
    // Example 1 = the rows tagged for no other device.
    return DEVICE_ORDINALS.map(o => `not @${o}-device`).join(' and ');
  }
  return `@${DEVICE_ORDINALS[workerId - 1]}-device`;
}

interface DeviceProcessOpts {
  /** The feature cucumber actually runs (an expanded copy when --count > 1). */
  featurePath: string;
  workerId: number;
  /** Stream the child's output to the console as it runs (single-device runs). */
  live: boolean;
  /** Apply the @<ordinal>-device example tag (pinned mode) or run the whole feature. */
  pinExample: boolean;
  /** Per-process cucumber JSON path, so concurrent devices don't overwrite. */
  reportJson?: string;
  /**
   * Stream this device's output live, prefixing every line (e.g. "[D2] "). Used
   * whenever several devices run at once, where a long loop would otherwise
   * print nothing until it finished. The LOG file still gets each device's
   * output as one clean, un-prefixed block.
   */
  linePrefix?: string;
  /** Appium server this device should use (see --server-per-device). */
  appiumUrl?: string;
}

/**
 * Run ONE feature on ONE device: a cucumber-js process pinned to the device via
 * CUCUMBER_WORKER_ID. Captures the raw process output (the logger cleans/formats
 * it); when `live` it also streams to the console in real time.
 */
function runDeviceProcess(opts: DeviceProcessOpts): Promise<DeviceRunResult> {
  const { featurePath, workerId, live, pinExample, reportJson, linePrefix, appiumUrl } = opts;
  return new Promise(resolve => {
    const cmdArgs = [
      'cucumber-js', '--config', 'cucumber.config.js', '--profile', 'isolated', featurePath,
    ];
    // Quoted because shell:true re-tokenizes and the tag expression has spaces.
    if (pinExample) cmdArgs.push('--tags', `"${tagForDevice(workerId)}"`);
    // --until-failure: stop this process the moment a cycle fails, instead of
    // grinding through the remaining expanded rows.
    if (stopOnFailure) cmdArgs.push('--fail-fast');
    // Re-run a cycle the transport killed. --fail-fast is the opposite intent
    // ("stop at the first failure"), so the two are mutually exclusive.
    if (retries > 0 && !stopOnFailure) cmdArgs.push('--retry', String(retries));

    const env: NodeJS.ProcessEnv = { ...process.env, CUCUMBER_WORKER_ID: String(workerId) };
    if (reportJson) env.RUN_REPORT_JSON = reportJson;
    // DriverManager reads APPIUM_URL_<1-based worker>. Set it here rather than
    // expecting the caller to export it: an env var typed on the command line
    // has to survive the shell, npm and this spawn to take effect, and when it
    // silently does not, every device quietly shares one server again.
    if (appiumUrl) env[`APPIUM_URL_${workerId + 1}`] = appiumUrl;

    const start = Date.now();
    // windowsHide: shell:true means a cmd.exe per lane on Windows (and npx
    // spawns another inside it), each of which pops up a console window — four
    // devices produced a screenful of command prompts. Output is piped here
    // anyway, so nothing is lost by hiding them. No effect on macOS/Linux.
    const child = spawn('npx', cmdArgs, { shell: true, env, windowsHide: true });
    let output = '';
    // Holds the tail of a chunk that didn't end on a newline, so a prefixed
    // line is only emitted once it is complete.
    let pending = '';
    const onData = (c: Buffer) => {
      const text = c.toString();
      output += text;
      if (live) {
        process.stdout.write(c); // single device: keep the live console verbatim
      } else if (linePrefix) {
        pending += text;
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        for (const line of lines) process.stdout.write(`${linePrefix}${line}\n`);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('close', code => {
      // Emit whatever never got its closing newline.
      if (!live && linePrefix && pending) process.stdout.write(`${linePrefix}${pending}\n`);
      resolve({ workerId, output, exitCode: code ?? 1, durationMs: Date.now() - start });
    });
  });
}

/**
 * Drop `adb` port forwards left behind by earlier runs on the devices we are
 * about to use.
 *
 * A killed or crashed run leaves its UiAutomator2 forward (tcp:8200, tcp:8201,
 * ...) bound. The next run's session then dies with "UiAutomator2 Server cannot
 * start because the local port #82xx is busy", and because the forward never
 * clears on its own, every retry fails the same way — the device looks broken
 * when only a stale forward is at fault. Worse, the failure surfaces as "a
 * BeforeAll hook errored", which reads like a code defect.
 *
 * Scoped to this run's devices rather than `adb forward --remove-all`, so a
 * suite running concurrently on other handsets is left alone.
 */
function clearStaleForwards(udids: string[]): void {
  // adb-only; iOS has no port forwards to leak.
  if (!usesAdb() || udids.length === 0) return;
  let listed = '';
  try {
    listed = spawnSync('adb', ['forward', '--list'], { encoding: 'utf8' }).stdout ?? '';
  } catch {
    return; // adb missing/unreachable — session creation will report it properly
  }
  for (const line of listed.split(/\r?\n/)) {
    // "<udid> tcp:<local> tcp:<remote>"
    const m = /^(\S+)\s+(tcp:\d+)\s+/.exec(line.trim());
    if (!m || !udids.includes(m[1])) continue;
    try {
      spawnSync('adb', ['-s', m[1], 'forward', '--remove', m[2]], { encoding: 'utf8' });
      console.log(`[runner] cleared stale forward ${m[2]} on ${m[1]}`);
    } catch { /* best effort */ }
  }
}

/** Filesystem-safe short name for a feature, used in report filenames. */
function featureSlug(featurePath: string): string {
  return path.basename(featurePath).replace(/\.feature$/, '').replace(/[^\w.-]/g, '_');
}

/**
 * This device's cucumber JSON fragment for `featurePath`. `laneIndex` keeps the
 * name unique when one device runs several lanes — without it, a device given
 * the same feature twice would overwrite its own first result.
 */
function reportJsonFor(workerId: number, featurePath: string, laneIndex?: number): string {
  const lane = laneIndex === undefined ? '' : `-l${laneIndex + 1}`;
  return path
    .join(REPORTS_DIR, `d${workerId + 1}-${featureSlug(featurePath)}${lane}.json`)
    .replace(/\\/g, '/');
}

/**
 * Turn a FOLDER argument into the individual .feature files inside it, so
 * `--assign` can give each one its own device.
 *
 * Passing a directory straight to cucumber would run every feature in it as a
 * single unit on ONE device, which is the opposite of what assigned mode is
 * for. Expanding here means:
 *     runner.ts --assign <features/securityLayer>
 * behaves exactly like listing the four files by hand. Sorted, so the
 * feature→device mapping is stable between runs rather than filesystem order.
 * Nested folders are included; non-.feature files are ignored.
 */
function collectFeatureFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      const full = path.join(dir, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) return collectFeatureFiles(full);
      return entry.name.endsWith('.feature') ? [full] : [];
    })
    .sort();
}

/** Expand any directory arguments; file arguments pass through untouched. */
function resolveFeatureArgs(args: string[]): string[] {
  return args.flatMap(arg => {
    try {
      if (fs.statSync(arg).isDirectory()) {
        const found = collectFeatureFiles(arg);
        console.log(`[runner] ${arg} → ${found.length} feature file(s)`);
        return found;
      }
    } catch { /* not a directory — treat as a file path */ }
    return [arg];
  });
}

/** Filename stem for a lane's batch fragments: "d2-businessProfile". */
function laneReportBase(lane: Lane): string {
  return `d${lane.workerId + 1}-${featureSlug(lane.featurePath)}`;
}

// =============================================================================
// Pinned mode — one feature spread across N devices
// =============================================================================

/**
 * Run ONE feature path across `deviceCount` devices — one pinned cucumber
 * process per device, all concurrently — then hand the captured output to the
 * logger to compose the feature's log section. Returns the feature's outcome.
 */
async function runFeature(
  source: string,
  runPath: string,
  deviceCount: number,
  logFd: number,
  deviceLabels: string[],
): Promise<StepResult> {
  console.log(`[runner] running: ${source} on ${deviceCount} device(s)`);
  const live = deviceCount === 1;
  const results = await Promise.all(
    Array.from({ length: deviceCount }, (_, i) => runDeviceProcess({
      featurePath: runPath,
      workerId: i,
      live,
      pinExample: true,
      // Concurrent devices must not share one JSON path or they overwrite each
      // other; a single-device run keeps the default target/cucumber-report.json.
      reportJson: deviceCount > 1 ? reportJsonFor(i, source) : undefined,
      linePrefix: live ? undefined : `[D${i + 1}] `,
      appiumUrl: serverPerDevice ? appiumUrlFor(i, appiumBasePort) : undefined,
    })),
  );
  return writeFeatureLog(logFd, { featurePath: source, deviceCount, deviceLabels, results });
}

// =============================================================================
// Assigned mode — a different feature per device
// =============================================================================

/**
 * Pair features with devices so that BOTH are fully used: lane i takes device
 * `i % deviceCount` and feature `i % featureCount`, for
 * max(featureCount, deviceCount) lanes. That covers every shape without anyone
 * having to think about it:
 *
 *   5 features, 5 devices -> a clean 1:1, each device its own feature
 *   1 feature,  2 devices -> BOTH devices run that feature, concurrently
 *   5 features, 2 devices -> surplus features queue behind others on a device
 *   2 features, 5 devices -> every device busy; the features repeat across them
 *
 * Nothing is ever silently dropped: every feature runs at least once and no
 * connected device is left idle.
 */
function buildLanes(
  targets: { source: string; run: string }[],
  deviceCount: number,
  udids: string[],
  count: number,
): Lane[] {
  const laneCount = Math.max(targets.length, deviceCount);
  return Array.from({ length: laneCount }, (_, i) => {
    const workerId = i % deviceCount;
    const t = targets[i % targets.length];
    return {
      workerId,
      udid: udids[workerId] ?? '(unknown udid)',
      featurePath: t.source,
      runPath: t.run,
      featureName: featureNameFromFile(t.source),
      count,
      reportJsons: [],
      results: [],
    };
  });
}

/**
 * Assigned mode entry point: one feature per device, all devices concurrent.
 * Each lane is a single cucumber process running that feature's N cycles.
 */
async function runAssigned(
  lanes: Lane[],
  deviceCount: number,
  count: number,
  logFd: number,
): Promise<StepResult[]> {
  console.log(`[runner] assigned mode — ${lanes.length} feature(s) across ${deviceCount} device(s), ` +
    `${count} cycle(s) each`);
  for (const lane of lanes) {
    console.log(`[runner]   Device ${lane.workerId + 1} (${lane.udid}) → ${lane.featurePath}`);
  }
  if (lanes.length > deviceCount) {
    console.log(`[runner]   NOTE: ${lanes.length} features but only ${deviceCount} device(s) — ` +
      `surplus features are queued behind others on the same device.`);
  }

  // Group lanes by device: a device works through its own queue in order, and
  // the devices run concurrently.
  const byDevice = new Map<number, Lane[]>();
  for (const lane of lanes) {
    const list = byDevice.get(lane.workerId) ?? [];
    list.push(lane);
    byDevice.set(lane.workerId, list);
  }

  const live = deviceCount === 1;
  // A soak keeps re-running the lane in batches until its deadline; a plain run
  // is simply a single batch. `deadline` is Infinity when --duration is absent.
  const deadline = soakMs > 0 ? Date.now() + soakMs : Infinity;

  await Promise.all([...byDevice.values()].map(async deviceLanes => {
    for (const lane of deviceLanes) {
      for (let batch = 1; ; batch++) {
        const reportJson = path
          .join(REPORTS_DIR, `${laneReportBase(lane)}-b${batch}.json`)
          .replace(/\\/g, '/');
        lane.reportJsons.push(reportJson);

        const result = await runDeviceProcess({
          featurePath: lane.runPath,
          workerId: lane.workerId,
          live,
          pinExample: false,   // whole feature on this device — no example pinning
          reportJson,
          linePrefix: live ? undefined : `[D${lane.workerId + 1}] `,
          appiumUrl: serverPerDevice ? appiumUrlFor(lane.workerId, appiumBasePort) : undefined,
        });
        lane.results.push(result);

        const ok = result.exitCode === 0;
        const remaining = deadline - Date.now();
        console.log(`[device ${lane.workerId + 1}] ${lane.featureName} batch ${batch} — ` +
          `${ok ? 'PASS' : 'FAIL'} (${(result.durationMs / 1000).toFixed(1)}s)` +
          (Number.isFinite(remaining) ? ` | ${humanMs(Math.max(0, remaining))} left` : ''));

        // Stop conditions, in priority order: a failure the caller asked to stop
        // on, then the time budget, then "this was a plain --count run".
        if (!ok && stopOnFailure) { lane.stoppedBecause = 'failure'; break; }
        if (!Number.isFinite(deadline)) { lane.stoppedBecause = 'count'; break; }
        if (Date.now() >= deadline) { lane.stoppedBecause = 'duration'; break; }
      }
    }
  }));

  writeAssignedLog(logFd, { lanes, count, deviceCount });

  return lanes.map(lane => ({
    label: `${lane.featureName} [device ${lane.workerId + 1}]`,
    status: lane.results.length > 0 && lane.results.every(r => r.exitCode === 0)
      ? 'passed' : 'failed',
    exitCode: lane.results.some(r => r.exitCode !== 0) ? 1 : 0,
  }));
}

// =============================================================================
// Report plumbing
// =============================================================================

/**
 * Merge every per-device cucumber JSON back into the single
 * target/cucumber-report.json that the HTML and Excel reporters read. The
 * cucumber JSON format is an array of features, so concatenation is valid and
 * the existing reporters need no change.
 */
function mergeReportJson(): void {
  if (!fs.existsSync(REPORTS_DIR)) return;
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) return;

  const merged: unknown[] = [];
  for (const f of files) {
    try {
      const text = fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8').trim();
      if (!text) continue;
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) merged.push(...parsed);
    } catch {
      // A crashed device can leave a truncated JSON — skip it rather than
      // losing the whole merged report.
      console.log(`[runner] skipping unreadable report fragment: ${f}`);
    }
  }
  fs.writeFileSync(path.resolve('target', 'cucumber-report.json'), JSON.stringify(merged));
  console.log(`[runner] merged ${files.length} report fragment(s) → target/cucumber-report.json`);
}

/** Regenerate the HTML + Excel reports from the run's cucumber JSON. */
function generateReports(): void {
  console.log('[runner] generating reports (HTML + Excel)');
  spawnSync('node', ['src/test/ts/reporting/generate-report.js'], { stdio: 'inherit', shell: true });
  spawnSync('npx', ['ts-node', 'src/test/ts/reporting/generate-excel.ts'], { stdio: 'inherit', shell: true });
}

// =============================================================================
// Entry point
// =============================================================================

async function main(): Promise<number> {
  // Positional args are feature paths; flags configure the execution mode.
  const argv = process.argv.slice(2);
  const featurePaths: string[] = [];
  let requestedParallel: number | undefined;
  let assign = false;
  let count = 1;
  // Distinguishes "--count 1" from "no --count given": with --duration the
  // batch size defaults to DEFAULT_BATCH_CYCLES, but an explicit 1 must be
  // honoured — otherwise a short trial soak silently runs 25-cycle batches.
  let countExplicit = false;
  // --plan: show which feature lands on which device, then stop. Cheap way to
  // confirm a command really is one-feature-per-device before committing hours
  // of device time to it.
  let planOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--parallel' || a === '-p') requestedParallel = Math.max(1, Number(argv[++i]) || 1);
    // Assigned mode: a different feature per device, run concurrently.
    else if (a === '--assign' || a === '-a') assign = true;
    // How many cycles of the feature to run (expands its Examples template row).
    else if (a === '--count' || a === '-c') { count = Math.max(1, Number(argv[++i]) || 1); countExplicit = true; }
    // Give each device its OWN Appium server (4723, 4724, ...). Start them
    // first; one server per device is what makes concurrent runs reliable.
    else if (a === '--server-per-device' || a === '-s') serverPerDevice = true;
    // Base port for the above, if the servers are not on 4723+.
    else if (a === '--appium-port') appiumBasePort = Number(argv[++i]) || DEFAULT_APPIUM_PORT;
    // Soak for a wall-clock budget instead of a fixed cycle count: "5h", "90m",
    // "3600s" (a bare number means minutes). Each lane repeats batches of
    // --count cycles until the budget is spent.
    else if (a === '--duration' || a === '-d') soakMs = parseDuration(argv[++i] ?? '');
    // Stop a lane the moment a cycle fails — "run until it breaks".
    else if (a === '--until-failure') stopOnFailure = true;
    // Re-run a failed cycle from a clean start (see `retries`).
    else if (a === '--retry') retries = Math.max(0, Number(argv[++i]) || 0);
    // Print the feature→device plan and exit, without starting any session.
    else if (a === '--plan') planOnly = true;
    // Target platform: android (default) or ios. Set in this process BEFORE
    // devices/DriverManager are consulted, and inherited by every spawned
    // cucumber worker, so the whole run agrees on one platform.
    else if (a === '--platform') process.env.APPIUM_PLATFORM = (argv[++i] ?? '').toLowerCase();
    // Fast run: skip the string-validation audit (its per-step full page-source
    // read is the heaviest query). The spawned cucumber inherits this env var.
    else if (a === '--no-audit') process.env.STRING_VALIDATION_AUDIT = '0';
    else if (!a.startsWith('-')) featurePaths.push(a);
  }

  // What the caller actually typed, kept for the log's Invocation line BEFORE
  // any folder is expanded. Reporting the expanded list there is noise: a
  // folder run would print all four .feature paths when the meaningful fact is
  // simply "the securityLayer folder was run".
  const invocation = featurePaths.join(' ');

  // A folder argument becomes one lane per .feature inside it.
  const resolvedPaths = resolveFeatureArgs(featurePaths);
  featurePaths.length = 0;
  featurePaths.push(...resolvedPaths);

  // Catch typos and stray shell text before anything is spawned — otherwise the
  // first thing the user sees is an ENOENT stack trace from deep inside the
  // expander.
  const missing = featurePaths.filter(p => !fs.existsSync(p));
  if (missing.length > 0) {
    console.error(`[runner] feature path(s) not found:\n${missing.map(m => `  - ${m}`).join('\n')}`);
    console.error('[runner] check for stray arguments — everything that is not a flag is ' +
      'treated as a feature path.');
    return 2;
  }

  if (featurePaths.length === 0) {
    console.error('Usage: ts-node src/test/ts/runner/runner.ts [--parallel N] [--count N] <feature> [...]');
    console.error('       ts-node src/test/ts/runner/runner.ts --assign [--count N] <feature> <feature> ...');
    console.error('Example: ts-node src/test/ts/runner/runner.ts --count 100 ' +
      'src/test/resources/features/securityLayer/voucherLogin.feature');
    return 2;
  }

  // Device slots: one per connected device (an explicit --parallel can lower it,
  // never exceeds the devices present). Assigned mode uses every connected
  // device even when fewer features were given — the features repeat across the
  // spare devices rather than leaving them idle.
  const udids = availableUdids();
  const connected = Math.max(1, udids.length);
  const deviceCount = Math.max(1, Math.min(requestedParallel ?? connected, connected));
  // With --duration, --count becomes the BATCH size: each batch is one cucumber
  // process and one Appium session, and the lane repeats batches until the
  // budget runs out. A big batch wastes time past the deadline; a tiny one pays
  // session start-up too often, hence the default.
  if (soakMs > 0 && !countExplicit) count = DEFAULT_BATCH_CYCLES;

  // Fail loudly and early if iOS was asked for on a non-Mac, rather than
  // letting every session fail with an obscure WebDriverAgent error.
  assertPlatformSupported();

  console.log(`[runner] platform: ${targetPlatform()} | host: ${process.platform}`);
  console.log(`[runner] connected devices: ${connected} | using: ${deviceCount}`);
  if (soakMs > 0) {
    console.log(`[runner] soak: up to ${humanMs(soakMs)} per lane, in batches of ${count} cycle(s)`);
  } else if (count > 1) {
    console.log(`[runner] cycles per feature: ${count}`);
  }
  if (stopOnFailure) console.log('[runner] --until-failure: each lane stops at its first failed cycle');
  if (serverPerDevice) {
    for (let i = 0; i < deviceCount; i++) {
      console.log(`[runner]   Device ${i + 1} → Appium ${appiumUrlFor(i, appiumBasePort)}`);
    }
  }

  if (!assign) {
    // Pinned mode: each device runs a FIXED example via its tag, so the
    // device→example mapping is deterministic.
    for (let i = 0; i < deviceCount; i++) {
      console.log(`[runner]   Device ${i + 1} → ${tagForDevice(i)}`);
    }
  }

  if (planOnly) {
    // Same pairing the real run would use — built from the SOURCE paths, since
    // --plan deliberately skips the --count expansion (nothing is written to
    // target/generated and no device is touched).
    console.log('');
    console.log('[runner] PLAN (--plan: nothing will be executed)');
    if (assign) {
      const preview = buildLanes(
        featurePaths.map(source => ({ source, run: source })), deviceCount, udids, count);
      for (const lane of preview) {
        console.log(`[runner]   Device ${lane.workerId + 1} (${lane.udid})` +
          `  →  ${path.basename(lane.featurePath)}`);
      }
      if (preview.length > deviceCount) {
        console.log(`[runner]   NOTE: ${preview.length} lanes on ${deviceCount} device(s) — ` +
          `the surplus queue behind others on the same device.`);
      }
    } else {
      for (const p of featurePaths) console.log(`[runner]   ${path.basename(p)} → all ${deviceCount} device(s), one example row each`);
    }
    return 0;
  }

  clearStaleForwards(udids.slice(0, deviceCount));

  prepareTargetDirs();
  // Start from a clean slate so a previous run's fragments/expansions can't leak
  // into this one's merged report.
  fs.rmSync(REPORTS_DIR, { recursive: true, force: true });
  fs.rmSync(GENERATED_DIR, { recursive: true, force: true });
  const shardedReports = assign || deviceCount > 1;
  if (shardedReports) fs.mkdirSync(REPORTS_DIR, { recursive: true });

  // Expand each feature's template row to `count` cycles. The source file is
  // untouched; cucumber runs the generated copy.
  const targets = featurePaths.map(source => {
    const run = expandFeature(source, count);
    if (run !== source) {
      console.log(`[runner] expanded ${path.basename(source)} → ${count} cycle(s): ` +
        `${path.relative(process.cwd(), run)}`);
    } else if (count > 1) {
      console.log(`[runner] WARNING: ${path.basename(source)} has no Examples table — ` +
        `--count ${count} cannot expand it; running it once.`);
    }
    return { source, run };
  });

  const { logFd, logPath } = openRunLog();
  writeRunHeader(logFd, {
    platform: targetPlatform(),
    hostOs: process.platform,
    deviceCount,
    featureCount: targets.length,
    cyclesEach: count,
    durationLabel: soakMs > 0 ? humanMs(soakMs) : undefined,
    invocation,
  });
  const results: StepResult[] = [];

  try {
    if (assign) {
      const lanes = buildLanes(targets, deviceCount, udids, count);
      results.push(...await runAssigned(lanes, deviceCount, count, logFd));
    } else {
      for (const t of targets) {
        results.push(await runFeature(t.source, t.run, deviceCount, logFd, udids));
      }
    }
  } finally {
    closeRunLog(logFd, logPath);
    console.log(`[runner] log saved: ${logPath}`);
  }

  if (shardedReports) mergeReportJson();
  generateReports();

  console.log('');
  for (const r of results) {
    console.log(`  ${r.status === 'passed' ? '✓' : '✗'} ${r.label} (${r.status})`);
  }
  return results.some(r => r.status !== 'passed') ? 1 : 0;
}

main().then(code => process.exit(code)).catch(err => {
  console.error('[runner] fatal:', err);
  process.exit(1);
});
