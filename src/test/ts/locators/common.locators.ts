/**
 * Locators shared across more than one screen / flow.
 *
 * Keeping cross-cutting selectors in one module is the Single-Responsibility
 * counterpart of the per-screen locator files: a selector that several pages
 * depend on has exactly one definition, so a UI change is a one-line edit.
 */

/** Bottom "Pay" tab — the unambiguous marker for the app home screen. */
export const HOME_TAB =
  '//android.widget.TextView[@text="Pay" or @text="ငွေပေး"]';

/** Loading / progress indicators — the UI is NOT settled while any show. */
export const LOADING_INDICATOR =
  '//android.widget.ProgressBar ' +
  '| //*[contains(@resource-id,"progress")] ' +
  '| //*[contains(@resource-id,"loading")] ' +
  '| //*[contains(@resource-id,"loader")]';

/** Error dialog the app raises when the login session has timed out. */
export const SESSION_EXPIRED =
  '//*[contains(@text,"Session Expired") or contains(@text,"session expired") ' +
  'or contains(@text,"Session expired")]';
