import { HOME_TAB } from './common.locators';

/**
 * Voucher module locators.
 *
 * The Voucher tile is the suite's cheapest login trigger: the module demands
 * re-authentication on EVERY open (verified on-device — a second open right
 * after a successful login prompts again), and it moves no money, so the login
 * screen can be exercised in a loop without side effects.
 *
 * Screen shapes, confirmed from a live page-source dump:
 *   - Home tile      : clickable RelativeLayout (id/mainView) wrapping the
 *                      "Voucher" label TextView (id/text).
 *   - Login screen   : the standard app login (id/activityloginpassword) —
 *                      same password field the rest of the suite drives via
 *                      LOGIN_LOCATORS, so nothing new is needed here.
 *   - Voucher module : a WebView (id/webView) hosting the voucher catalogue;
 *                      its in-page header carries "sendBackIndex" (back arrow)
 *                      and the "voucherListing" container.
 */
export const VOUCHER_LOCATORS = {
  HOME_TAB,

  // Home tile — the clickable ancestor of the "Voucher" label, so the tap
  // lands on the container that actually handles it (the label itself is
  // clickable="false"). Burmese build labels the tile "ပြေစာ".
  VOUCHER_TILE:
    '//*[@clickable="true" and .//*[@text="Voucher" or @text="VOUCHER" or contains(@text,"ပြေစာ")]] ' +
    '| //*[(@text="Voucher" or contains(@text,"ပြေစာ")) and @clickable="true"] ' +
    '| //*[@content-desc="Voucher" or contains(@content-desc,"ပြေစာ")]',

  // Module marker — the voucher WebView is up. The in-page ids (voucherListing
  // / sendBackIndex) are the reliable signal; the native webView id is the
  // fallback for a page that is still rendering.
  VOUCHER_MODULE:
    '//*[@resource-id="voucherListing"] ' +
    '| //*[@resource-id="sendBackIndex"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/webView"]',

  // In-page back arrow in the module header. Device Back works too and is the
  // primary exit; this is the explicit control when one is preferred.
  BACK_ARROW: '//*[@resource-id="sendBackIndex"]',

  // ---------------------------------------------------------------------------
  // Fast probes — UiAutomator resourceId lookups instead of XPath tree walks.
  //
  // DO NOT use these while the voucher WebView is on screen. A UiSelector
  // lookup walks the accessibility tree, and this app's WebView tree CRASHES
  // the UiAutomator2 instrumentation ("cannot be proxied ... instrumentation
  // process is not running"). The crash is unrecoverable: every later command
  // on that session fails, including screenshots, so one bad probe kills the
  // rest of the loop. XPath over the same screen is slower but safe, which is
  // why voucherPage polls the XPath variants instead.
  //
  // These were previously written WITHOUT the `android=` prefix, so
  // WebdriverIO parsed them as CSS, threw, and isPresent() swallowed it and
  // returned false — every time. They never actually ran, which is the only
  // reason the crash went unnoticed. Kept here, correctly spelled, for use on
  // NATIVE screens only.
  // ---------------------------------------------------------------------------

  /** Voucher WebView container — present as soon as the module starts loading. */
  VOUCHER_MODULE_UIA:
    'android=new UiSelector().resourceId("com.jas.digitalkyats:id/webView")',

  /** Bottom Home tab — the "we are back on Home" marker. */
  HOME_TAB_UIA:
    'android=new UiSelector().resourceId("com.jas.digitalkyats:id/home")',
} as const;
