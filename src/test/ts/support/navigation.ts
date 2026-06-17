/**
 * Navigation utilities — composite gestures (scroll-to, back-until) built on
 * the {@link IUiActions} primitives.
 */

import type { IUiActions } from '../support/IUiActions';

/**
 * Scroll the screen until the target element is displayed, trying both down
 * and up directions. WDIO's click can fail with "not displayed" when the
 * element exists in the page source but is off-screen — this brings it into
 * the visible viewport first.
 */
export async function scrollIntoView(ui: IUiActions, selector: string): Promise<void> {
  if (await ui.isDisplayed(selector)) return;

  for (const direction of ['down', 'up'] as const) {
    for (let i = 0; i < 4; i++) {
      await ui.scroll(direction);
      await ui.pause(600);
      if (await ui.isDisplayed(selector)) return;
    }
  }
  // Fall through — let the caller's click attempt produce a proper error.
}

/**
 * Press Back repeatedly until the marker is present (or `maxBacks` is hit).
 * Never restarts the app.
 */
export async function backNavigateUntil(
  ui: IUiActions,
  marker: string,
  maxBacks = 6,
): Promise<boolean> {
  for (let i = 0; i < maxBacks; i++) {
    if (await ui.isPresent(marker)) return true;
    try { await ui.back(); } catch { /* ignore */ }
    await ui.pause(800);
  }
  return ui.isPresent(marker);
}
