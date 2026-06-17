/**
 * stringValidationAuditor - audits the text the app actually displays against
 * the English / Myanmar string resources loaded by stringsRepository.
 *
 * Flow per screen (see auditScreen):
 *   1. Pull every `text=` / `content-desc=` value out of the page source
 *      (same regex approach as transactionLog.ts).
 *   2. Skip dynamic content (amounts, dates, ids - anything with no letters).
 *   3. Detect each string's language by its characters (Myanmar Unicode block
 *      -> my, otherwise Latin -> en) so mixed screens and either render mode
 *      are handled without trusting the device locale.
 *   4. Look the value up in that language's resources to resolve its `name`,
 *      then confirm the same `name` is mapped in the other language too.
 *
 * Reporting (see writeReport) - NO appending. Each run writes fresh files:
 *   target/stringValidation/<feature>/<feature>_<lang>_<stamp>.{html,json}
 *   where <lang> is the run's language (from STRING_VALIDATION_LANG, else the
 *   dominant detected language) and <stamp> is the execution time. The run's
 *   findings are split per feature, so test:sequence drops one file in each
 *   feature folder while test:payto drops one in payTo/.
 *
 * Auto-combine: after writing a feature's file, if the OTHER language's file
 * already exists in that folder, a brand-new side-by-side comparison file
 *   target/stringValidation/<feature>/<feature>_final_<stamp>.{html,json}
 * is written. The two raw files are never modified - combine only reads them.
 *
 * Used as a singleton by hooks/stringValidationHooks.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  getStringsRepository,
  normalizeValue,
  type Lang,
  type StringsRepository,
} from './stringsRepository';

export type FindingStatus =
  | 'matched' // value found in its language's XML, and the name is mapped in the other language
  | 'missingTranslation' // value found, but the same name has no counterpart in the other language
  | 'unmatched'; // looks like a static label but absent from its language's XML (hardcoded / wrong key)

export interface Finding {
  /** The feature file this label was seen in, e.g. "payTo.feature". */
  feature: string;
  /** The step text the screen was captured during. */
  screen: string;
  lang: Lang;
  text: string;
  status: FindingStatus;
  /** name(s) the value resolved to (empty for `unmatched`). */
  names: string[];
  /** When the label was captured, long human-readable format. */
  time: string;
}

/** Long-format timestamp, e.g. "Monday, 16 June 2026 at 10:30:45 GMT+5:30". */
function longTime(): string {
  try {
    return new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'long' });
  } catch {
    return new Date().toString();
  }
}

/** Filename-safe timestamp incl. milliseconds, e.g. "2026-06-16_10-30-45-123". */
function fileStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}-${ms}`
  );
}

export const REPORT_DIR = path.resolve('target', 'stringValidation');
// Under `--parallel`, cucumber sets CUCUMBER_WORKER_ID per worker process; keep
// each worker's files distinct. Single runs (id unset) add no suffix.
const WORKER_SUFFIX =
  process.env.CUCUMBER_WORKER_ID !== undefined ? `.w${process.env.CUCUMBER_WORKER_ID}` : '';

/** Myanmar script: main block + extensions A and Extended-B. */
const MYANMAR_RE = /[က-႟ꧠ-꧿ꩠ-ꩿ]/;
/** Any letter (Latin or otherwise) - used to weed out pure-numeric/symbol text. */
const HAS_LETTER_RE = /\p{L}/u;
const HAS_LATIN_RE = /[A-Za-z]/;

/** Decide which resource file a displayed string should be checked against. */
function detectLang(text: string): Lang | undefined {
  if (MYANMAR_RE.test(text)) return 'my';
  if (HAS_LATIN_RE.test(text)) return 'en';
  return undefined; // no script we localize -> treat as dynamic, skip
}

/**
 * True for text that is dynamic data, not a translatable label: empty, no
 * letters at all (amounts, phone/account numbers, dates, ids), or a lone
 * symbol. Such strings are never expected in strings.xml.
 */
function isDynamic(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (!HAS_LETTER_RE.test(t)) return true; // digits / currency / punctuation only
  return false;
}

function extractDisplayedText(pageSource: string): string[] {
  const out = new Set<string>();
  for (const m of pageSource.matchAll(/text="([^"]*)"/g)) {
    const t = m[1].trim();
    if (t) out.add(t);
  }
  for (const m of pageSource.matchAll(/content-desc="([^"]*)"/g)) {
    const t = m[1].trim();
    if (t) out.add(t);
  }
  return Array.from(out);
}

function featureBase(featureFile: string): string {
  return (featureFile || 'unknown.feature').replace(/\.feature$/i, '');
}

interface ReportSummary {
  repoLoaded: boolean;
  screensAudited: number;
  distinctStrings: number;
  matched: number;
  missingTranslation: number;
  unmatched: number;
}

interface RawReport {
  generatedAt: string;
  feature: string;
  lang: Lang;
  summary: ReportSummary;
  parity: ReturnType<StringsRepository['parityReport']>;
  findings: Finding[];
}

export class StringValidationAuditor {
  private readonly repo: StringsRepository;
  private readonly findings: Finding[] = [];
  /** page-source hashes already audited - skip identical re-renders. */
  private readonly seenScreens = new Set<string>();
  /** `${feature}::${lang}::${normalizedText}` already recorded. */
  private readonly seenStrings = new Set<string>();
  /** screens audited, per feature file. */
  private readonly screensByFeature = new Map<string, number>();

  constructor(repo: StringsRepository = getStringsRepository()) {
    this.repo = repo;
  }

  /** Audit the current screen. Cheap and idempotent for identical screens. */
  auditScreen(pageSource: string, screenName: string, featureName = ''): void {
    if (!pageSource) return;
    const hash = crypto.createHash('md5').update(pageSource).digest('hex');
    if (this.seenScreens.has(hash)) return;
    this.seenScreens.add(hash);
    this.screensByFeature.set(featureName, (this.screensByFeature.get(featureName) ?? 0) + 1);
    const time = longTime();

    for (const text of extractDisplayedText(pageSource)) {
      if (isDynamic(text)) continue;
      const lang = detectLang(text);
      if (!lang) continue;

      const key = `${featureName}::${lang}::${normalizeValue(text)}`;
      if (this.seenStrings.has(key)) continue;
      this.seenStrings.add(key);

      const names = this.repo.resolveName(text, lang);
      let status: FindingStatus;
      if (names.length === 0) {
        status = 'unmatched';
      } else {
        // Matched if ANY resolved name also has a value in the other language.
        const hasCounterpart = names.some((n) => this.repo.counterpart(n, lang) !== undefined);
        status = hasCounterpart ? 'matched' : 'missingTranslation';
      }
      this.findings.push({ feature: featureName, screen: screenName, lang, text, status, names, time });
    }
  }

  /** Run language: explicit env wins, else the dominant detected language. */
  private runLang(findings: Finding[]): Lang {
    const env = (process.env.STRING_VALIDATION_LANG ?? '').toLowerCase();
    if (env === 'en' || env === 'my') return env;
    const my = findings.filter((f) => f.lang === 'my').length;
    const en = findings.filter((f) => f.lang === 'en').length;
    return my > en ? 'my' : 'en';
  }

  private summarize(findings: Finding[], screensAudited: number): ReportSummary {
    const by = (s: FindingStatus) => findings.filter((f) => f.status === s);
    return {
      repoLoaded: this.repo.isLoaded,
      screensAudited,
      distinctStrings: findings.length,
      matched: by('matched').length,
      missingTranslation: by('missingTranslation').length,
      unmatched: by('unmatched').length,
    };
  }

  /**
   * Write one fresh per-language file per feature, then auto-combine with the
   * other language if its file already exists. Never appends.
   */
  writeReport(): void {
    if (this.findings.length === 0 && this.screensByFeature.size === 0) return;
    const parity = this.repo.parityReport();
    const generatedAt = longTime();
    const stamp = fileStamp();

    // Group this run's findings by feature file.
    const byFeature = new Map<string, Finding[]>();
    for (const f of this.findings) {
      const arr = byFeature.get(f.feature) ?? [];
      arr.push(f);
      byFeature.set(f.feature, arr);
    }
    // Features that produced screens but no findings still deserve an (empty) file.
    for (const feat of this.screensByFeature.keys()) {
      if (!byFeature.has(feat)) byFeature.set(feat, []);
    }

    for (const [featureFile, findings] of byFeature) {
      const feature = featureBase(featureFile);
      const lang = this.runLang(findings);
      const dir = path.join(REPORT_DIR, feature);
      const report: RawReport = {
        generatedAt,
        feature,
        lang,
        summary: this.summarize(findings, this.screensByFeature.get(featureFile) ?? 0),
        parity,
        findings,
      };
      const base = `${feature}_${lang}_${stamp}${WORKER_SUFFIX}`;
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${base}.json`), JSON.stringify(report, null, 2), 'utf8');
        fs.writeFileSync(path.join(dir, `${base}.html`), renderRawHtml(report), 'utf8');
        console.log(
          `   string validation [${feature} · ${lang}] -> ${report.summary.matched} matched, ` +
            `${report.summary.missingTranslation} missing-translation, ${report.summary.unmatched} unmatched. ` +
            `Report: target/stringValidation/${feature}/${base}.html`,
        );
        this.autoCombine(dir, feature, lang, stamp, report);
        pruneOldReports(dir, feature); // keep only the most recent file of each kind
      } catch {
        // best-effort: an audit-log write must not fail the run
      }
    }
  }

  /**
   * If the other language's latest raw file exists in `dir`, write a fresh
   * side-by-side comparison file. Reads the two raw files; modifies neither.
   */
  private autoCombine(dir: string, feature: string, thisLang: Lang, stamp: string, current: RawReport): void {
    const otherLang: Lang = thisLang === 'en' ? 'my' : 'en';
    const otherFile = latestRawJson(dir, feature, otherLang);
    if (!otherFile) return;
    let other: RawReport;
    try {
      other = JSON.parse(fs.readFileSync(path.join(dir, otherFile), 'utf8'));
    } catch {
      return;
    }
    const enFindings = thisLang === 'en' ? current.findings : other.findings;
    const myFindings = thisLang === 'en' ? other.findings : current.findings;
    const compare = buildComparison(feature, current.parity, enFindings, myFindings);
    const base = `${feature}_final_${stamp}${WORKER_SUFFIX}`;
    try {
      fs.writeFileSync(path.join(dir, `${base}.json`), JSON.stringify(compare, null, 2), 'utf8');
      fs.writeFileSync(path.join(dir, `${base}.html`), renderCompareHtml(compare), 'utf8');
      console.log(
        `   string validation [${feature} · final] -> ${compare.rows.length} names, ` +
          `${compare.summary.matched} matched, ${compare.summary.notMatched} not-matched. ` +
          `Report: target/stringValidation/${feature}/${base}.html`,
      );
    } catch {
      // best-effort
    }
  }
}

/**
 * Keep only the most recent file of each kind (en / my / final) and extension
 * (html / json) in a feature folder; delete older timestamped duplicates. The
 * latest en and my raw files are retained so the comparison can still rebuild.
 */
function pruneOldReports(dir: string, feature: string): void {
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return;
  }
  const feat = feature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Newest file of each kind+extension is kept; everything else under this
  // feature's prefix (older runs, legacy _compare_ files) is removed.
  const keep = new Set<string>();
  for (const kind of ['en', 'my', 'final']) {
    for (const ext of ['html', 'json']) {
      const re = new RegExp(`^${feat}_${kind}_.*\\.${ext}$`);
      const newest = files.filter((f) => re.test(f)).sort().reverse()[0]; // newest first
      if (newest) keep.add(newest);
    }
  }
  const ownPrefix = new RegExp(`^${feat}_`);
  for (const f of files) {
    if (!ownPrefix.test(f) || keep.has(f)) continue;
    try {
      fs.unlinkSync(path.join(dir, f));
    } catch {
      // ignore
    }
  }
}

/** Newest `<feature>_<lang>_*.json` raw file in dir (excludes _final_ files). */
function latestRawJson(dir: string, feature: string, lang: Lang): string | undefined {
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return undefined;
  }
  const prefix = `${feature}_${lang}_`;
  const cands = files.filter(
    (f) => f.startsWith(prefix) && f.endsWith('.json') && !f.includes('_final_'),
  );
  cands.sort().reverse(); // timestamp in name => lexical sort is chronological
  return cands[0];
}

export interface CompareRow {
  name: string;
  english: string;
  myanmar: string;
  status: string;
}

export interface CompareReport {
  generatedAt: string;
  feature: string;
  parity: ReturnType<StringsRepository['parityReport']>;
  summary: { names: number; matched: number; notMatched: number };
  rows: CompareRow[];
}

function buildComparison(
  feature: string,
  parity: ReturnType<StringsRepository['parityReport']>,
  enFindings: Finding[],
  myFindings: Finding[],
): CompareReport {
  const byName = new Map<string, { en?: Finding; my?: Finding }>();
  const add = (f: Finding, side: 'en' | 'my') => {
    for (const n of f.names) {
      const cell = byName.get(n) ?? {};
      cell[side] = f;
      byName.set(n, cell);
    }
  };
  for (const f of enFindings) if (f.names.length) add(f, 'en');
  for (const f of myFindings) if (f.names.length) add(f, 'my');

  const rows: CompareRow[] = [];
  for (const [name, cell] of byName) {
    rows.push({
      name,
      english: cell.en?.text ?? '—',
      myanmar: cell.my?.text ?? '—',
      status: compareStatus(cell.en, cell.my),
    });
  }
  rows.sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
  const matched = rows.filter((r) => r.status === 'matched').length;
  return {
    generatedAt: longTime(),
    feature,
    parity,
    summary: { names: rows.length, matched, notMatched: rows.length - matched },
    rows,
  };
}

/**
 * Comparison status in plain terms:
 *   matched                      - the name was shown (and resolved) in BOTH languages
 *   Myanmar string not available - shown in English but the Myanmar side is missing
 *   English string not available - shown in Myanmar but the English side is missing
 */
function compareStatus(en?: Finding, my?: Finding): string {
  if (en && my) return 'matched';
  if (en && !my) return 'Myanmar string not available';
  if (my && !en) return 'English string not available';
  return 'not matched';
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Plain-language status for a single-language run's finding. */
function rawStatusLabel(status: FindingStatus, lang: Lang): string {
  if (status === 'matched') return 'matched';
  if (status === 'missingTranslation') {
    return lang === 'en' ? 'Myanmar string not available' : 'English string not available';
  }
  return 'not matched'; // unmatched: not in its own language's XML
}

const PAGE_STYLE = `<style>
 body{font-family:system-ui,Arial,sans-serif;margin:24px;color:#222}
 h1{margin-bottom:4px} .muted{color:#777;font-size:13px}
 table{border-collapse:collapse;width:100%;margin-top:12px;font-size:13px}
 th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
 th{background:#f4f4f4}
 .cards{display:flex;gap:12px;margin:14px 0;flex-wrap:wrap}
 .card{border:1px solid #ddd;border-radius:8px;padding:10px 14px;min-width:120px}
 .card b{display:block;font-size:22px}
 tr.matched td:first-child,tr.OK td:last-child{color:#137333}
 tr.missingTranslation td:first-child{color:#b06000;font-weight:600}
 tr.unmatched td:first-child{color:#c5221f;font-weight:600}
 .warn{background:#fff7e6;border:1px solid #ffd591;padding:8px 12px;border-radius:6px}
</style>`;

function renderRawHtml(report: RawReport): string {
  const { summary, parity, findings, feature, lang } = report;
  const rows = findings
    .slice()
    .sort((a, b) => a.status.localeCompare(b.status) || a.text.localeCompare(b.text))
    .map(
      (f) => `<tr class="${f.status}">
        <td>${esc(rawStatusLabel(f.status, f.lang))}</td><td>${f.lang}</td>
        <td>${esc(f.text)}</td><td>${esc(f.names.join(', '))}</td>
        <td>${esc(f.feature)}</td><td>${esc(f.screen)}</td><td>${esc(f.time)}</td></tr>`,
    )
    .join('\n');
  const list = (names: string[]) =>
    names.length ? names.map((n) => `<code>${esc(n)}</code>`).join(', ') : '<em>none</em>';
  return `<!doctype html><html><head><meta charset="utf-8">
<title>String Validation — ${esc(feature)} (${lang})</title>
${PAGE_STYLE}</head><body>
<h1>String Validation — ${esc(feature)} <span class="muted">(${lang})</span></h1>
<div class="muted">Executed ${esc(report.generatedAt)}</div>
${summary.repoLoaded ? '' : '<p class="warn">No string resources were loaded - add strings.en.xml / strings.my.xml.</p>'}
<div class="cards">
 <div class="card">Screens<b>${summary.screensAudited}</b></div>
 <div class="card">Distinct labels<b>${summary.distinctStrings}</b></div>
 <div class="card">Matched<b style="color:#137333">${summary.matched}</b></div>
 <div class="card">${lang === 'en' ? 'Myanmar string not available' : 'English string not available'}<b style="color:#b06000">${summary.missingTranslation}</b></div>
 <div class="card">Not matched<b style="color:#c5221f">${summary.unmatched}</b></div>
</div>
<h2>XML name parity</h2>
<p>English keys: <b>${parity.enCount}</b> &middot; Myanmar keys: <b>${parity.myCount}</b></p>
<p>Names in English but missing from Myanmar: ${list(parity.missingInMy)}</p>
<p>Names in Myanmar but missing from English: ${list(parity.missingInEn)}</p>
<h2>On-screen findings</h2>
<table><thead><tr><th>Status</th><th>Lang</th><th>Displayed text</th><th>Resolved name(s)</th><th>Feature file</th><th>Step / screen</th><th>Executed time</th></tr></thead>
<tbody>
${rows}
</tbody></table>
</body></html>`;
}

function renderCompareHtml(report: CompareReport): string {
  const { summary, rows, feature } = report;
  const body = rows
    .map(
      (r) => `<tr class="${r.status === 'matched' ? 'matched' : ''}">
        <td><code>${esc(r.name)}</code></td><td>${esc(r.english)}</td>
        <td>${esc(r.myanmar)}</td><td>${esc(r.status)}</td></tr>`,
    )
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8">
<title>String Validation Compare — ${esc(feature)}</title>
${PAGE_STYLE}</head><body>
<h1>String Validation — ${esc(feature)} <span class="muted">English vs Myanmar</span></h1>
<div class="muted">Generated ${esc(report.generatedAt)}</div>
<div class="cards">
 <div class="card">Names<b>${summary.names}</b></div>
 <div class="card">Matched<b style="color:#137333">${summary.matched}</b></div>
 <div class="card">Not matched<b style="color:#b06000">${summary.notMatched}</b></div>
</div>
<table><thead><tr><th>Name</th><th>English</th><th>Myanmar</th><th>Status</th></tr></thead>
<tbody>
${body}
</tbody></table>
</body></html>`;
}

let cached: StringValidationAuditor | undefined;

/** Shared auditor instance for the run. */
export function getStringValidationAuditor(): StringValidationAuditor {
  cached ??= new StringValidationAuditor();
  return cached;
}
