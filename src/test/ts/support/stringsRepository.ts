/**
 * stringsRepository - loads the app's English and Myanmar `strings.xml`
 * resource files and turns them into lookup tables for the localization audit.
 *
 * Each resource file is the flat Android format:
 *
 *     <string name="merchant_info">Merchant Information</string>
 *
 * The `name` is the key that links the two languages; the body is the visible
 * value. The audit runs the lookup *backwards*: given a string the app showed
 * on screen, find which `name` it belongs to, then check the same `name` is
 * mapped in the other language too.
 *
 * Parsing is a small regex (same approach as transactionLog.ts) so no XML
 * dependency is needed - the format is flat and well-formed.
 *
 * Loading is lazy and best-effort: cucumber `require`s every file under
 * support/, so importing this module must never read a file or throw. The
 * files are read on first use; a missing file yields an empty side (the parity
 * report still works against whatever is present).
 */

import * as fs from 'fs';
import * as path from 'path';

export type Lang = 'en' | 'my';

/** Default resource locations; override with STRING_VALIDATION_EN_PATH / _MY_PATH. */
export const EN_PATH =
  process.env.STRING_VALIDATION_EN_PATH ?? path.resolve('src/test/resources/stringValidation/strings.en.xml');
export const MY_PATH =
  process.env.STRING_VALIDATION_MY_PATH ?? path.resolve('src/test/resources/stringValidation/strings.my.xml');

/** `<string name="...">value</string>` - body is non-greedy, may span lines. */
const STRING_ENTRY = /<string\s+name="([^"]+)"([^>]*)>([\s\S]*?)<\/string>/g;

/** Decode the five XML entities Android string files use. */
function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Normalize a value for matching: unescape, trim, collapse internal
 * whitespace, drop a trailing ellipsis (… or ...). Applied to both XML values
 * and on-screen text so cosmetic differences don't cause false misses.
 */
export function normalizeValue(s: string): string {
  return unescapeXml(s)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(?:\.\.\.|…)$/u, '')
    .trim();
}

interface ParsedFile {
  /** name -> normalized value, for translatable entries only. */
  byName: Map<string, string>;
  /** normalized value -> name(s) that produce it. */
  byValue: Map<string, string[]>;
}

function parseFile(filePath: string): ParsedFile {
  const byName = new Map<string, string>();
  const byValue = new Map<string, string[]>();
  let xml: string;
  try {
    xml = fs.readFileSync(filePath, 'utf8');
  } catch {
    return { byName, byValue }; // missing file -> empty side
  }
  for (const m of xml.matchAll(STRING_ENTRY)) {
    const name = m[1];
    const attrs = m[2] ?? '';
    const rawValue = m[3] ?? '';
    // Skip non-UI entries (class names, signature flags, etc).
    if (/translatable\s*=\s*"false"/.test(attrs)) continue;
    const value = normalizeValue(rawValue);
    if (!value) continue;
    byName.set(name, value);
    const names = byValue.get(value);
    if (names) names.push(name);
    else byValue.set(value, [name]);
  }
  return { byName, byValue };
}

export interface ParityReport {
  /** names present in English but missing from Myanmar. */
  missingInMy: string[];
  /** names present in Myanmar but missing from English. */
  missingInEn: string[];
  enCount: number;
  myCount: number;
}

export class StringsRepository {
  private readonly en: ParsedFile;
  private readonly my: ParsedFile;

  constructor(enPath: string = EN_PATH, myPath: string = MY_PATH) {
    this.en = parseFile(enPath);
    this.my = parseFile(myPath);
  }

  private side(lang: Lang): ParsedFile {
    return lang === 'en' ? this.en : this.my;
  }

  /** True when at least one of the two files parsed to a non-empty map. */
  get isLoaded(): boolean {
    return this.en.byName.size > 0 || this.my.byName.size > 0;
  }

  /** Names whose value (in `lang`) matches the given on-screen text. */
  resolveName(text: string, lang: Lang): string[] {
    return this.side(lang).byValue.get(normalizeValue(text)) ?? [];
  }

  /** The value of `name` in the OTHER language, or undefined if unmapped. */
  counterpart(name: string, lang: Lang): string | undefined {
    const other: Lang = lang === 'en' ? 'my' : 'en';
    return this.side(other).byName.get(name);
  }

  /** Whether `name` is mapped in each language file. */
  hasMapping(name: string): { en: boolean; my: boolean } {
    return { en: this.en.byName.has(name), my: this.my.byName.has(name) };
  }

  /** Pure name-parity diff between the two files - no device needed. */
  parityReport(): ParityReport {
    const missingInMy: string[] = [];
    const missingInEn: string[] = [];
    for (const name of this.en.byName.keys()) {
      if (!this.my.byName.has(name)) missingInMy.push(name);
    }
    for (const name of this.my.byName.keys()) {
      if (!this.en.byName.has(name)) missingInEn.push(name);
    }
    missingInMy.sort();
    missingInEn.sort();
    return {
      missingInMy,
      missingInEn,
      enCount: this.en.byName.size,
      myCount: this.my.byName.size,
    };
  }
}

let cached: StringsRepository | undefined;

/** Lazily-built shared repository. Reads the XML files on first call. */
export function getStringsRepository(): StringsRepository {
  cached ??= new StringsRepository();
  return cached;
}
