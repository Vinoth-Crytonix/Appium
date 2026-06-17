/**
 * Diagnostics - artefact capture for the `target/` folder.
 *
 * Project-wide conventions:
 *   - PNGs (`target/*-receipt.png` and on-failure captures from the hook)
 *     are produced ONLY for receipt screens and failures. Mid-flow PNGs
 *     are forbidden - call `dump()` for screen / locator diagnostics.
 *   - Page-source XML dumps go to `target/diagnostics/` (subfolder) so the
 *     top-level target/ stays tidy. The runner wipes that subfolder at the
 *     start of every run.
 *
 * Single Responsibility: artifact capture lives here, so neither the page
 * objects nor the step definitions repeat the "mkdir + write file" boilerplate.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IUiActions } from '../support/IUiActions';

const TARGET_DIR      = path.resolve('target');
const DIAGNOSTICS_DIR = path.join(TARGET_DIR, 'diagnostics');

export class Diagnostics {
  constructor(private readonly ui: IUiActions) {}

  /**
   * Save a PNG to `target/<fileName>`. Reserved for receipt screens and
   * the on-failure hook. Do NOT call from mid-flow page methods.
   */
  async screenshot(fileName: string): Promise<void> {
    const png = await this.ui.takeScreenshot();
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    fs.writeFileSync(path.join(TARGET_DIR, fileName), png, 'base64');
  }

  /**
   * Dump the current page source to `target/diagnostics/<prefix>-<name>.xml`.
   * No PNG. Best-effort: never throws, so a dump failure cannot fail a scenario.
   */
  async dump(prefix: string, name: string): Promise<void> {
    try {
      fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
      const source = await this.ui.getPageSource();
      fs.writeFileSync(path.join(DIAGNOSTICS_DIR, `${prefix}-${name}.xml`), source);
    } catch { /* ignore */ }
  }
}
