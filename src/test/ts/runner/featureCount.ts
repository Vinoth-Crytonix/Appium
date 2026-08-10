/**
 * featureCount - turns ONE example row into N, so a feature file never has to
 * carry a hand-written table of repeats.
 *
 * A looping feature (log in 100 times, pay 50 times) used to mean 100 pasted
 * `Examples` rows. That is unreadable, and changing the count means editing the
 * file. Instead the feature keeps a SINGLE template row and the runner is told
 * how many cycles to run:
 *
 *     ts-node runner.ts --count 10  <feature>      -> 10 cycles
 *     ts-node runner.ts --count 100 <feature>      -> 100 cycles
 *
 * The expanded feature is written to target/generated/ and THAT copy is what
 * cucumber executes; the source file under src/ is never modified. Because the
 * cycles are example rows of one Scenario Outline, all N run inside a SINGLE
 * cucumber process and therefore a SINGLE Appium session — the session start-up
 * cost is paid once, not N times.
 *
 * Auto-filled columns (both optional, matched case-insensitively):
 *   SlNo  - the 1-based cycle number
 *   Total - the requested count, so a scenario name can read "cycle 7 of 100"
 * Every other column is copied from the template row as-is.
 *
 * If a feature has several template rows, they are cycled through until N rows
 * exist — so a 2-row table with --count 10 runs each row 5 times.
 */

import * as fs from 'fs';
import * as path from 'path';

/** Where expanded copies are written. Wiped and rebuilt by the runner. */
export const GENERATED_DIR = path.resolve('target', 'generated');

const EXAMPLES_RE = /^\s*(?:@\S+\s+)?Examples\s*:/;
const TABLE_ROW_RE = /^\s*\|/;
const COMMENT_RE = /^\s*#/;

/** Cell values of a gherkin table row, trimmed, without the outer pipes. */
function cells(row: string): string[] {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

/**
 * Re-emit a row with the template's indentation, padding each column to the
 * widest of header / template / value so the generated table stays readable
 * when someone opens it to debug a failing cycle.
 */
function formatRow(template: string, header: string, values: string[]): string {
  const indent = /^\s*/.exec(template)?.[0] ?? '      ';
  const headerCells = cells(header);
  const templateCells = cells(template);
  const padded = values.map((v, i) =>
    v.padEnd(Math.max(headerCells[i]?.length ?? 0, templateCells[i]?.length ?? 0, v.length)));
  return `${indent}| ${padded.join(' | ')} |`;
}

/**
 * Build the N data rows for one Examples block from its template row(s),
 * filling the SlNo / Total columns when the header declares them.
 */
function expandRows(header: string, templates: string[], count: number): string[] {
  const headerCells = cells(header).map(h => h.toLowerCase());
  const slNoAt = headerCells.indexOf('slno');
  const totalAt = headerCells.indexOf('total');

  const rows: string[] = [];
  for (let cycle = 1; cycle <= count; cycle++) {
    const template = templates[(cycle - 1) % templates.length];
    const values = cells(template);
    if (slNoAt >= 0) values[slNoAt] = String(cycle);
    if (totalAt >= 0) values[totalAt] = String(count);
    rows.push(formatRow(template, header, values));
  }
  return rows;
}

/**
 * Expand every Examples block in `featurePath` to `count` rows and write the
 * result to target/generated/. Returns the path cucumber should run: the
 * generated copy, or the original when there is nothing to do (count <= 1, or
 * the feature has no Examples table — a plain `Scenario:` cannot be looped this
 * way and is returned untouched).
 */
export function expandFeature(featurePath: string, count: number): string {
  if (count <= 1) return featurePath;

  const source = fs.readFileSync(featurePath, 'utf8');
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let expanded = false;

  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    if (!EXAMPLES_RE.test(lines[i])) continue;

    // Carry over blank/comment lines that sit between `Examples:` and the table.
    let j = i + 1;
    while (j < lines.length && !TABLE_ROW_RE.test(lines[j]) &&
           (lines[j].trim() === '' || COMMENT_RE.test(lines[j]))) {
      out.push(lines[j]);
      j++;
    }
    if (j >= lines.length || !TABLE_ROW_RE.test(lines[j])) { i = j - 1; continue; }

    // Header, then every data row. Commented-out rows are DROPPED: they are the
    // hand-maintained repeats this flag exists to replace.
    const header = lines[j];
    out.push(header);
    j++;
    const templates: string[] = [];
    while (j < lines.length && (TABLE_ROW_RE.test(lines[j]) || COMMENT_RE.test(lines[j]))) {
      if (TABLE_ROW_RE.test(lines[j])) templates.push(lines[j]);
      j++;
    }

    if (templates.length > 0) {
      out.push(...expandRows(header, templates, count));
      expanded = true;
    }
    i = j - 1;
  }

  if (!expanded) return featurePath;

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const outPath = path.join(GENERATED_DIR, path.basename(featurePath));
  fs.writeFileSync(outPath, out.join('\n'));
  return outPath;
}
