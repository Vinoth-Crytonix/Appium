/**
 * perfHookUtils - timing math + per-run aggregation for @performance scenarios.
 * Called from hooks/perfHooks.ts; no direct cucumber import here so the math
 * stays testable in isolation.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ITestStepHookParameter } from '@cucumber/cucumber';

interface StepSample {
  scenario: string;
  step: string;
  durationMs: number;
  worker: string;
  timestamp: string;
}

const samples: StepSample[] = [];
const stepStart = new WeakMap<object, number>();

export function startStepTimer(param: ITestStepHookParameter): void {
  stepStart.set(param.pickleStep as unknown as object, Date.now());
}

export function recordStepTiming(param: ITestStepHookParameter): void {
  const started = stepStart.get(param.pickleStep as unknown as object);
  if (started === undefined) return;
  samples.push({
    scenario: param.pickle.name,
    step: param.pickleStep.text,
    durationMs: Date.now() - started,
    worker: process.env.CUCUMBER_WORKER_ID ?? '0',
    timestamp: new Date().toISOString(),
  });
}

export function flushSamples(outDir = 'target'): string | null {
  if (samples.length === 0) return null;
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `perf-samples-w${process.env.CUCUMBER_WORKER_ID ?? '0'}.json`);
  fs.writeFileSync(file, JSON.stringify(samples, null, 2));
  return file;
}
