/**
 * Popup locators - catalog of unexpected/irrelevant dialogs that the
 * framework auto-dismisses globally (see support/popupHandler.ts and
 * hooks/popupHooks.ts).
 *
 * Each entry pairs a SIGNATURE (an element that proves the popup is shown)
 * with a DISMISS selector (the button to tap). When a popup also triggers a
 * follow-up flow (Secure Token Expired -> re-login), the handler does that
 * after the dismiss so callers don't need to know.
 *
 * Add new entries here when you encounter a fresh nuisance popup - the rest
 * of the framework picks it up automatically.
 */

/** Generic affirmative-button matcher reused by many popups. */
const OK_BUTTON =
  '//*[@clickable="true" and (@text="OK" or @text="Ok" or @text="ok" ' +
  'or @text="OKAY" or @text="Okay" or @text="okay" ' +
  'or @text="ဟုတ်ကဲ့" or @text="အိုကေ")]';

const CONTINUE_BUTTON =
  '//*[@clickable="true" and (@text="Continue" or @text="CONTINUE" or @text="ဆက်လုပ်ရန်")]';

const DISMISS_BUTTON =
  '//*[@clickable="true" and (@text="Dismiss" or @text="DISMISS" or @text="Close" or @text="CLOSE" or @text="ပိတ်ရန်")]';

const CANCEL_BUTTON =
  '//*[@clickable="true" and (@text="Cancel" or @text="CANCEL" or @text="ပယ်ဖျက်")]';

const RETRY_BUTTON =
  '//*[@clickable="true" and (@text="Retry" or @text="RETRY" or @text="Try Again" or @text="ထပ်ကြိုးစားရန်")]';

export interface PopupRule {
  /** Short id used in logs. */
  name: string;
  /** Element(s) that prove this popup is on screen. */
  signature: string;
  /** Selector for the button that dismisses it. Tried in order if a chain. */
  dismiss: string;
  /**
   * Hint to the handler that this popup triggers a re-login afterwards.
   * The handler will run LoginPage.performLogin() once the popup is gone.
   */
  followsWithLogin?: boolean;
}

/**
 * Ordered list - the handler checks rules top-to-bottom and dismisses the
 * first match. Put more specific popups before generic ones so a "Secure
 * Token Expired" dialog is not absorbed by the generic OK fallback first.
 */
export const POPUP_RULES: readonly PopupRule[] = [
  // ---- Session / auth -------------------------------------------------
  {
    name: 'secure-token-expired',
    signature:
      '//*[contains(@text,"Secure Token Expired") ' +
      'or contains(@text,"Session Expired") ' +
      'or contains(@text,"session expired") ' +
      'or contains(@text,"Session expired") ' +
      'or contains(@text,"လုံခြုံရေး") ' +
      'or contains(@text,"အသိပေးချက်")]',
    dismiss: OK_BUTTON,
    followsWithLogin: true,
  },

  // ---- Connectivity ---------------------------------------------------
  {
    name: 'no-internet',
    signature:
      '//*[contains(@text,"No Internet") or contains(@text,"No internet") ' +
      'or contains(@text,"Internet Connection") or contains(@text,"အင်တာနက်")]',
    dismiss: `${OK_BUTTON} | ${RETRY_BUTTON} | ${DISMISS_BUTTON}`,
  },
  {
    name: 'network-error',
    signature:
      '//*[contains(@text,"Network Error") or contains(@text,"Connection Failed") ' +
      'or contains(@text,"Server not reachable") or contains(@text,"Time out")]',
    dismiss: `${OK_BUTTON} | ${RETRY_BUTTON} | ${DISMISS_BUTTON}`,
  },

  // ---- Generic transaction / app notices -----------------------------
  {
    name: 'transaction-notice',
    signature:
      '//*[contains(@text,"Transaction") and (contains(@text,"Failed") ' +
      'or contains(@text,"declined") or contains(@text,"unable") ' +
      'or contains(@text,"pending"))]',
    dismiss: `${OK_BUTTON} | ${DISMISS_BUTTON} | ${CANCEL_BUTTON}`,
  },

  // ---- System update / promo banners ---------------------------------
  {
    name: 'app-update',
    signature:
      '//*[contains(@text,"Update Available") or contains(@text,"New version") ' +
      'or contains(@text,"Update your app")]',
    // Prefer "Later" / Cancel - "OK" / "Update" would leave the store.
    dismiss:
      '//*[@clickable="true" and (@text="Later" or @text="LATER" or @text="Skip" or @text="SKIP")] ' +
      `| ${CANCEL_BUTTON} | ${DISMISS_BUTTON}`,
  },

  // ---- Catch-all: a modal with only an OK button --------------------
  // Place LAST. Matched only when no specific rule above fires.
  {
    name: 'generic-ok-dialog',
    signature:
      '//*[contains(@resource-id,"alertTitle") or contains(@class,"AlertDialog") ' +
      'or contains(@resource-id,"dialog")]',
    dismiss: `${OK_BUTTON} | ${CONTINUE_BUTTON} | ${DISMISS_BUTTON}`,
  },
] as const;

/**
 * One combined "is ANY popup on screen?" probe — the union of every rule's
 * signature. The popup sweep does this single query first and only falls back
 * to the per-rule scan when it matches, so the common clean-screen case costs
 * one element lookup instead of one-per-rule. Derived from POPUP_RULES so it
 * can never drift out of sync as rules are added.
 */
export const ANY_POPUP_SIGNATURE: string =
  POPUP_RULES.map((r) => `(${r.signature})`).join(' | ');
