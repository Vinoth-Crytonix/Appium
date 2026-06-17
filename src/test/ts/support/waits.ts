/**
 * Synchronisation utilities — built purely on the {@link IUiActions}
 * abstraction so they work against any driver implementation.
 *
 * These compose primitive gestures into the higher-level "wait until the app
 * is ready" behaviour that pages need, keeping pages free of polling loops.
 */

import type { IUiActions } from '../support/IUiActions';
import { LOADING_INDICATOR } from '../locators/common.locators';

/** Poll `isPresent` until the element appears; returns whether it did. */
export async function waitForPresent(
  ui: IUiActions,
  selector: string,
  timeoutMs: number,
  pollMs = 500,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await ui.isPresent(selector)) return true;
    await ui.pause(pollMs);
  }
  return ui.isPresent(selector);
}

/** Wait until a screen marker is present (the screen has been reached). */
export async function waitForScreen(
  ui: IUiActions,
  marker: string,
  timeoutMs: number,
): Promise<boolean> {
  // Poll briskly (400ms) so screen arrival is detected with low latency
  // instead of up to a full second after the redirect completes.
  return waitForPresent(ui, marker, timeoutMs, 400);
}

export interface StableUiOptions {
  settleMs?: number;
  timeoutMs?: number;
  stableHits?: number;
}

/**
 * Dynamic wait — block until the screen has genuinely settled: no loading
 * indicator AND the page source identical across `stableHits` consecutive
 * reads. Requiring multiple identical reads prevents returning on a screen
 * that is only momentarily static mid-transition.
 */
export async function waitForStableUi(
  ui: IUiActions,
  opts: StableUiOptions = {},
): Promise<void> {
  const settleMs   = opts.settleMs   ?? 300;
  const timeoutMs  = opts.timeoutMs  ?? 20_000;
  const stableHits = opts.stableHits ?? 2;
  const deadline   = Date.now() + timeoutMs;
  let prev = '';
  let hits = 0;
  await ui.pause(150);
  while (Date.now() < deadline) {
    let loading = false;
    try { loading = await ui.isPresent(LOADING_INDICATOR); } catch { /* ignore */ }
    // While a loading indicator is up the screen is definitionally unsettled —
    // skip the (expensive) page-source read until it clears.
    if (loading) {
      hits = 0;
      await ui.pause(settleMs);
      continue;
    }
    let cur = '';
    try { cur = await ui.getPageSource(); } catch { /* ignore */ }
    if (cur && cur === prev) {
      if (++hits >= stableHits) return;
    } else {
      hits = 0;
    }
    prev = cur;
    await ui.pause(settleMs);
  }
}
