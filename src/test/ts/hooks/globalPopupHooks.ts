/**
 * globalPopupHooks - GLOBAL safety-net dismissal of unexpected OK / Close
 * popups, across every module and feature - existing AND any created in future.
 *
 * Design contract (per the team's rule):
 *   1. If a feature SCRIPTS the popup itself (its own "dismiss the popup" /
 *      "click OK" steps), that feature owns the popup - this hook must NOT
 *      pre-empt it. Such features are excluded by tag below.
 *   2. If an UNEXPECTED popup (one the feature never mentions) appears while
 *      the script runs, this hook taps its OK / Close so the flow can carry on.
 *
 * Future-proof by construction: the scope is an EXCLUSION expression, so it
 * fires for every scenario by default. A feature added later is covered the
 * moment it exists - nothing to register. The list below is only the handful
 * of features that handle their own popups step-by-step; add a tag here ONLY
 * when a new feature starts scripting its own popup steps.
 *
 * Why a separate hook from the global popupHooks/PopupHandler:
 *   PopupHandler is *signature-gated* - it only taps a dismiss button once a
 *   rule's SIGNATURE proves a KNOWN dialog container. A custom popup that is
 *   just a layout + message + OK/Close button matches no signature, so that
 *   sweep never fires on it. This hook keys off the BUTTON itself, catching
 *   exactly those un-catalogued popups.
 *
 * Auditability: every auto-dismissal is printed to the console, which the
 * runner tees into the existing per-run log (target/logs/appium_run_*.log).
 * The line names the STEP the popup appeared after, so a passing run still
 * shows exactly where an unexpected popup interrupted the flow. No separate
 * log file is created.
 *
 * Excluded features (they handle their popups step-by-step in the .feature):
 *   @merchant-payment - session-expiry OK + "close" in the Amount field
 *   @electricity      - "If any popup appears after meter number" / "dismiss"
 *   @request-money    - "I confirm the success popup"
 *
 * Best-effort by design: a flaky probe must never turn a passing step into a
 * failure, so the handler swallows its own errors.
 */

import { AfterStep } from '@cucumber/cucumber';
import { TestWorld } from '../support/world';
import { logPopupHandled } from '../support/logger';

// A clickable OK or Close button, English + Burmese. Text-based only: dialog
// dismiss buttons are TextViews, whereas a screen "exit"/back is an icon
// (content-desc / arrow) - so this never grabs a legitimate non-popup control.
const OK_OR_CLOSE_BUTTON =
  '//*[@clickable="true" and (' +
  '@text="OK" or @text="Ok" or @text="ok" ' +
  'or @text="OKAY" or @text="Okay" or @text="okay" ' +
  'or @text="Close" or @text="CLOSE" or @text="close" ' +
  'or @text="ဟုတ်ကဲ့" or @text="အိုကေ" or @text="ပိတ်ရန်")]';

// The exact button labels above, used to separate the button text from the
// popup's message text when describing a dismissal for the log.
const BUTTON_LABELS = new Set([
  'OK', 'Ok', 'ok', 'OKAY', 'Okay', 'okay',
  'Close', 'CLOSE', 'close', 'ဟုတ်ကဲ့', 'အိုကေ', 'ပိတ်ရန်',
]);

// Global, minus the features that own their popup handling in the .feature.
const SCOPE = 'not @merchant-payment and not @electricity and not @request-money';

// Process-lifetime counter so each dismissal gets a stable run-relative number.
let popupCount = 0;

const decodeXml = (s: string): string =>
  s.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

/**
 * Best-effort description of the popup from the page source: the message
 * text(s) and which button we are about to tap. Prefers text from dialog-ish
 * containers (resource-id mentioning message/title/dialog/...) and falls back
 * to all on-screen text, minus the button labels.
 */
function describePopup(source: string): { message: string; button: string } {
  const tags = source.match(/<[^>]+>/g) ?? [];
  const dialogTexts: string[] = [];
  const allTexts: string[] = [];
  for (const tag of tags) {
    const tm = tag.match(/\btext="([^"]*)"/);
    if (!tm) continue;
    const text = decodeXml(tm[1]).trim();
    if (!text) continue;
    allTexts.push(text);
    if (/resource-id="[^"]*(message|alerttitle|dialog|content|msg|title|tv_)[^"]*"/i.test(tag)) {
      dialogTexts.push(text);
    }
  }
  const button = allTexts.find((t) => BUTTON_LABELS.has(t)) ?? 'OK/Close';
  const pool = (dialogTexts.length ? dialogTexts : allTexts).filter((t) => !BUTTON_LABELS.has(t));
  const message = [...new Set(pool)].slice(0, 6).join(' ').slice(0, 140) || '(no text captured)';
  return { message, button };
}

AfterStep({ tags: SCOPE }, async function (this: TestWorld, params: any) {
  // The per-scenario Before hook attaches the driver; if it hasn't yet, skip.
  if (!this.driver) return;
  const step = params?.pickleStep?.text ?? 'step';
  try {
    // Loop so a stack of popups raised at one step boundary is fully cleared
    // (and each one logged). Capped so a re-spawning dialog can't hang the run.
    for (let i = 0; i < 3; i++) {
      if (!(await this.ui.isPresent(OK_OR_CLOSE_BUTTON))) break;
      let desc = { message: '(page source unread)', button: 'OK/Close' };
      try {
        desc = describePopup(await this.ui.getPageSource());
      } catch {
        /* keep the fallback description */
      }
      await this.ui.click(OK_OR_CLOSE_BUTTON, 3000);
      await this.ui.pause(400);
      popupCount += 1;
      // A highly-visible banner (teed into the per-run log by the runner) naming
      // the step the popup followed and the device, so it stands out from the
      // plain "✓ <step>" trace and is verifiable.
      logPopupHandled(
        `#${popupCount} dismissed [${desc.button}] after step "${step}": "${desc.message}"`,
      );
    }
  } catch {
    // best-effort - never let a popup probe break the step
  }
});
