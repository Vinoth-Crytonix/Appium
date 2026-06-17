/**
 * transactionLog - shared, append-only audit log of successful transactions
 * across every payment module (payTo, merchantPayment, electricity,
 * myanmarPayPersonal).
 *
 * One file per project: `target/transactions.log`. The file is NEVER wiped
 * by the runner's cleanTargetForFreshRun() sweep - it accumulates across
 * runs so you have a historical record of every successful payment.
 *
 * Each record is a few `key: value` lines separated by a blank line so the
 * file stays grep-friendly. Pages call `recordTransaction()` from their
 * receipt-handling path - the helper does the page-source scan, the file
 * write, and best-effort error swallowing in one place.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IUiActions } from './IUiActions';

export const TRANSACTIONS_LOG_PATH = path.resolve('target', 'transactions.log');

export interface TransactionExtras {
  amount?: string;
  payee?: string;
  status?: string;
  /** Anything else worth keeping (Merchant ID, Meter Number, etc). */
  [key: string]: string | undefined;
}

/**
 * Scan a page source for the most likely Transaction ID token.
 *
 * The AUT shows the ID as a long numeric string on the receipt screen. We
 * accept 15+ digits (Myanmar Pay uses 20+, electricity / payTo / merchant
 * commonly use 15-19) and prefer the longest match if several appear.
 */
export function extractTransactionId(pageSource: string): string | undefined {
  const candidates = new Set<string>();
  // 1) text="..." attribute values
  for (const m of pageSource.matchAll(/text="([^"]+)"/g)) {
    const t = m[1].trim();
    if (/^\d{15,}$/.test(t)) candidates.add(t);
  }
  // 2) content-desc fallback (some skins move the ID there)
  for (const m of pageSource.matchAll(/content-desc="([^"]+)"/g)) {
    const t = m[1].trim();
    if (/^\d{15,}$/.test(t)) candidates.add(t);
  }
  if (candidates.size === 0) return undefined;
  // Prefer the longest token - reduces false hits on phone numbers or
  // shorter reference codes that happen to be all digits.
  return Array.from(candidates).sort((a, b) => b.length - a.length)[0];
}

/**
 * Append one transaction record to `target/transactions.log`. Best-effort:
 * if the disk write fails we swallow the error - the test must not fail
 * because of an audit-log side effect.
 */
export function appendTransactionRecord(
  module: string,
  txnId: string,
  extras: TransactionExtras = {},
): void {
  const fields: Record<string, string> = {
    'Captured At':    new Date().toISOString(),
    'Module':         module,
    'Transaction ID': txnId,
    ...Object.fromEntries(
      Object.entries(extras).filter(([, v]) => v !== undefined && v !== ''),
    ) as Record<string, string>,
  };
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  const record = ['---', ...lines, ''].join('\n');
  try {
    fs.mkdirSync(path.dirname(TRANSACTIONS_LOG_PATH), { recursive: true });
    fs.appendFileSync(TRANSACTIONS_LOG_PATH, record, { encoding: 'utf8' });
  } catch {
    // best-effort
  }
}

/**
 * High-level helper for pages: read the current page source, pull out the
 * Transaction ID, append a record. Returns the captured ID (or undefined).
 *
 * Call this from each payment page right after the receipt screen has
 * settled. A second call on the same screen is harmless - duplicates are
 * written as separate records, and the user can dedupe by grepping
 * `Transaction ID:` and sorting -u.
 */
export async function recordTransaction(
  ui: IUiActions,
  module: string,
  extras: TransactionExtras = {},
): Promise<string | undefined> {
  try {
    const source = await ui.getPageSource();
    const txnId = extractTransactionId(source);
    if (!txnId) return undefined;
    appendTransactionRecord(module, txnId, extras);
    return txnId;
  } catch {
    return undefined;
  }
}
