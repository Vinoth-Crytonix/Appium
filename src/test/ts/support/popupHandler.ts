/**
 * PopupHandler - global, dynamic dismissal of unexpected/irrelevant popups.
 *
 * Single Responsibility: scan the current screen against the rule catalog in
 * locators/popups.locators.ts and dismiss whatever matches, looping until the
 * screen is clean (or a sanity cap is hit). Special-case: when a rule is
 * flagged `followsWithLogin`, the handler performs LoginPage.performLogin()
 * once the popup has been dismissed - so the test resumes mid-flow without
 * the feature file needing its own "If Login screen appears" step.
 *
 * The handler is invoked from the global hook (hooks/popupHooks.ts) before
 * and after every step. Pages can also call it on demand when they know a
 * gesture is likely to surface a transient dialog.
 */

import type { IUiActions } from './IUiActions';
import type { LoginPage } from '../pages/loginPage';
import { POPUP_RULES, ANY_POPUP_SIGNATURE, type PopupRule } from '../locators/popups.locators';

export interface PopupHandlerOptions {
  /** Max popups to dismiss in one call (protects against infinite loops). */
  maxPasses?: number;
  /** Per-rule presence probe timeout. Kept short - we are polling. */
  probeMs?: number;
}

export class PopupHandler {
  constructor(
    private readonly ui: IUiActions,
    private readonly login: LoginPage,
  ) {}

  /**
   * Scan once and dismiss all matching popups (up to maxPasses).
   *
   * Best-effort: a flaky page-source read must never turn a passing step
   * into a failure, so every probe is wrapped in try/catch and the method
   * resolves quietly if nothing matches.
   */
  async dismissAny(opts: PopupHandlerOptions = {}): Promise<string[]> {
    const maxPasses = opts.maxPasses ?? 3;
    const dismissed: string[] = [];

    for (let pass = 0; pass < maxPasses; pass++) {
      const rule = await this.firstMatchingRule();
      if (!rule) return dismissed;

      const cleared = await this.dismissOne(rule);
      if (!cleared) {
        // Could not tap the dismiss button - bail out so we do not spin.
        return dismissed;
      }
      dismissed.push(rule.name);

      if (rule.followsWithLogin) {
        await this.maybePerformLogin();
      }
    }
    return dismissed;
  }

  private async firstMatchingRule(): Promise<PopupRule | undefined> {
    // Fast path: one combined query. On a clean screen (no popup at all — the
    // common case) this returns false and we skip the per-rule scan entirely,
    // turning ~6 element lookups into 1.
    try {
      if (!(await this.ui.isPresent(ANY_POPUP_SIGNATURE))) return undefined;
    } catch {
      return undefined;
    }
    for (const rule of POPUP_RULES) {
      try {
        if (await this.ui.isPresent(rule.signature)) return rule;
      } catch {
        // ignore - try the next rule
      }
    }
    return undefined;
  }

  private async dismissOne(rule: PopupRule): Promise<boolean> {
    try {
      await this.ui.click(rule.dismiss, 4000);
      await this.ui.pause(500);
      return true;
    } catch {
      return false;
    }
  }

  private async maybePerformLogin(): Promise<void> {
    try {
      // Give the login screen a beat to appear after the OK tap.
      await this.ui.pause(800);
      if (await this.login.isPrompted()) {
        await this.login.performLogin();
      }
    } catch {
      // best-effort
    }
  }
}
