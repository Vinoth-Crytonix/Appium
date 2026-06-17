/**
 * BasePage â€” the shared substrate every page object extends.
 *
 * It carries the two collaborators every page needs (the interaction layer
 * and the diagnostics recorder) and exposes a single `dump()` helper. Pages
 * stay focused on their own screen; cross-cutting plumbing lives here once.
 *
 * Liskov: every concrete page is a drop-in `BasePage`, so the World can hold
 * and hand them around uniformly.
 */

import type { IUiActions } from '../support/IUiActions';
import type { Diagnostics } from '../support/diagnostics';

/** The collaborators a page object is constructed with (Dependency Injection). */
export interface PageContext {
  ui: IUiActions;
  diagnostics: Diagnostics;
}

export abstract class BasePage {
  protected readonly ui: IUiActions;
  protected readonly diagnostics: Diagnostics;

  /** Filename prefix for this page's `target/` diagnostic dumps. */
  protected abstract readonly dumpPrefix: string;

  constructor(ctx: PageContext) {
    this.ui = ctx.ui;
    this.diagnostics = ctx.diagnostics;
  }

  /** Dump page source + screenshot for this page (best-effort). */
  protected async dump(name: string): Promise<void> {
    await this.diagnostics.dump(this.dumpPrefix, name);
  }
}
