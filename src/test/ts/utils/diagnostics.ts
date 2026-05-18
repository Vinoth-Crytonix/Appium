/**
 * Diagnostics — screenshots and page-source dumps for the `target/` folder.
 *
 * Single Responsibility: artifact capture lives here, so neither the page
 * objects nor the step definitions repeat the "take screenshot + mkdir +
 * write file" boilerplate that used to be copy-pasted across step files.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IUiActions } from '../support/IUiActions';

const TARGET_DIR = path.resolve('target');

export class Diagnostics {
  constructor(private readonly ui: IUiActions) {}

  /** Save a PNG screenshot to `target/<fileName>` (fileName includes .png). */
  async screenshot(fileName: string): Promise<void> {
    const png = await this.ui.takeScreenshot();
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    fs.writeFileSync(path.join(TARGET_DIR, fileName), png, 'base64');
  }

  /**
   * Dump page source + screenshot for diagnosing screens / locators.
   * Writes `target/<prefix>-<name>.xml` and `target/<prefix>-<name>.png`.
   * Best-effort — never throws, so a dump failure cannot fail a scenario.
   */
  async dump(prefix: string, name: string): Promise<void> {
    try {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
      const source = await this.ui.getPageSource();
      fs.writeFileSync(path.join(TARGET_DIR, `${prefix}-${name}.xml`), source);
      await this.screenshot(`${prefix}-${name}.png`);
    } catch { /* ignore */ }
  }
}
