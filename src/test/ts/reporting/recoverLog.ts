/**
 * recoverLog — rebuild a run log from the per-batch cucumber JSON in
 * target/reports/, for a run whose own log was never written.
 *
 * Why this exists: the runner accumulates every lane's output in memory and
 * writes the log only when the whole run finishes. If the process is killed
 * first — a closed terminal, a machine reboot, a Ctrl+C hours in — the log is
 * left holding nothing but its header placeholder, even though every batch
 * completed and its results are already on disk. A 2-hour soak produced 800
 * cycles that way and the summary had to be reconstructed by hand.
 *
 * What IS recoverable: per-cycle pass/fail, per-feature tallies, failed cycle
 * numbers, ratios, batch counts, and the run's wall-clock span (from the
 * fragment file timestamps).
 *
 * What is NOT: the step-by-step traces. Those are the spawned processes'
 * console output, held in the runner's memory, and they die with it. The
 * rebuilt log therefore carries results without the narrative.
 *
 * Usage:  npx ts-node src/test/ts/reporting/recoverLog.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const REPORTS_DIR = path.join(ROOT, 'target', 'reports');
const LOGS_DIR = path.join(ROOT, 'target', 'logs');

interface Tally {
  device: number;
  feature: string;
  batches: number;
  passed: number;
  failed: number;
  failedAt: number[];
  firstSeen: number;
  lastSeen: number;
}

/** "d2-personalProfile-b7.json" -> { device: 2, feature: 'personalProfile' } */
function parseFragmentName(file: string): { device: number; feature: string } | null {
  const m = /^d(\d+)-(.+)-b\d+\.json$/.exec(file);
  return m ? { device: Number(m[1]), feature: m[2] } : null;
}

function collect(): Tally[] {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  const byLane = new Map<string, Tally>();

  // Batch order matters: cycle numbers must continue across batches rather
  // than restarting at 1, so "Failed Cycles" points at the real cycle.
  const files = fs.readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => {
      const na = Number(/-b(\d+)\.json$/.exec(a)?.[1] ?? 0);
      const nb = Number(/-b(\d+)\.json$/.exec(b)?.[1] ?? 0);
      return a.replace(/-b\d+\.json$/, '').localeCompare(b.replace(/-b\d+\.json$/, '')) || na - nb;
    });

  for (const file of files) {
    const parsed = parseFragmentName(file);
    if (!parsed) continue;
    const full = path.join(REPORTS_DIR, file);
    let features: unknown;
    try {
      const text = fs.readFileSync(full, 'utf8').trim();
      if (!text) continue;
      features = JSON.parse(text);
    } catch {
      continue;   // a batch killed mid-write leaves truncated JSON
    }
    if (!Array.isArray(features)) continue;

    const key = `${parsed.device}-${parsed.feature}`;
    const lane = byLane.get(key) ?? {
      device: parsed.device, feature: parsed.feature, batches: 0,
      passed: 0, failed: 0, failedAt: [],
      firstSeen: Number.MAX_SAFE_INTEGER, lastSeen: 0,
    };
    const stat = fs.statSync(full);
    lane.firstSeen = Math.min(lane.firstSeen, stat.mtimeMs);
    lane.lastSeen = Math.max(lane.lastSeen, stat.mtimeMs);
    lane.batches += 1;

    for (const feature of features as { elements?: unknown[] }[]) {
      for (const scenario of feature.elements ?? []) {
        const steps = (scenario as { steps?: unknown[] }).steps;
        if (!Array.isArray(steps) || steps.length === 0) continue;
        const failed = steps.some(
          s => (s as { result?: { status?: string } })?.result?.status === 'failed');
        if (failed) {
          lane.failed += 1;
          lane.failedAt.push(lane.passed + lane.failed);
        } else {
          lane.passed += 1;
        }
      }
    }
    byLane.set(key, lane);
  }
  return [...byLane.values()].sort((a, b) => a.device - b.device);
}

function human(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

function main(): void {
  const lanes = collect();
  if (lanes.length === 0) {
    console.log('[recover] no readable fragments in target/reports — nothing to rebuild.');
    return;
  }

  const started = Math.min(...lanes.map(l => l.firstSeen));
  const ended = Math.max(...lanes.map(l => l.lastSeen));
  const cycles = lanes.reduce((a, l) => a + l.passed + l.failed, 0);
  const passed = lanes.reduce((a, l) => a + l.passed, 0);
  const ratio = cycles ? ((passed / cycles) * 100).toFixed(2) : '0.00';
  const bar = '='.repeat(80);
  const dash = '-'.repeat(80);
  const out: string[] = [];

  out.push(bar, 'APPIUM TEST RUN  (RECOVERED)', bar, '');
  out.push(`Recovered From  : target/reports/*.json`);
  out.push(`Started         : ${new Date(started).toLocaleString('en-IN')} IST  (approx — from fragment timestamps)`);
  out.push(`Ended           : ${new Date(ended).toLocaleString('en-IN')} IST`);
  out.push(`Elapsed         : ${human(ended - started)}`);
  out.push(`Devices         : ${lanes.length}`);
  out.push(`Features        : ${new Set(lanes.map(l => l.feature)).size}`);
  out.push(`Total Count     : ${cycles}`);
  out.push('');
  out.push('NOTE: the original run was interrupted before it wrote its log, so the');
  out.push('step-by-step traces are unavailable — they lived in the runner process.');
  out.push('Everything below is reconstructed from the per-batch cucumber JSON.');
  out.push('', bar, '');

  out.push('═'.repeat(80), '  OVERALL SUCCESS RATIO', '═'.repeat(80), '');
  out.push(`Devices         : ${lanes.length}`);
  out.push(`Total Cycles    : ${cycles}`);
  out.push(`Passed          : ${passed}`);
  out.push(`Failed          : ${cycles - passed}`);
  out.push(`Success Ratio   : ${ratio}%`);
  out.push('');

  lanes.forEach((lane, i) => {
    const total = lane.passed + lane.failed;
    const laneRatio = total ? ((lane.passed / total) * 100).toFixed(1) : '0.0';
    const failedList = lane.failedAt.length
      ? lane.failedAt.slice(0, 30).join(', ') + (lane.failedAt.length > 30 ? ', ...' : '')
      : 'none';
    out.push('', bar, `TEST EXECUTION LOG  —  EXECUTION ${i + 1}`, bar, '');
    out.push(`Execution No    : ${i + 1} of ${lanes.length}`);
    out.push(`Feature File    : ${lane.feature}`);
    out.push(`Device          : ${lane.device}`);
    out.push(`Batches         : ${lane.batches}`);
    out.push('', dash, 'RESULT', dash, '');
    out.push(`Cycles          : ${total} executed`);
    out.push(`Passed          : ${lane.passed}`);
    out.push(`Failed          : ${lane.failed}`);
    out.push(`Failed Cycles   : ${failedList}`);
    out.push(`Success Ratio   : ${laneRatio}%`);
    out.push(`Average Cycle   : ${total ? ((lane.lastSeen - lane.firstSeen) / total / 1000).toFixed(1) : '0'} Seconds  (approx)`);
    out.push('');
  });

  out.push('', bar, 'END OF RECOVERED LOG', bar, '');

  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const stamp = new Date(started).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = path.join(LOGS_DIR, `Appium_RECOVERED_${stamp}.log`);
  fs.writeFileSync(file, out.join('\n'));
  console.log(`[recover] ${cycles} cycles across ${lanes.length} lane(s) → ${path.relative(ROOT, file)}`);
  console.log(`[recover] overall ${passed}/${cycles} = ${ratio}%`);
}

main();
