/**
 * Locators shared across more than one screen / flow.
 *
 * Keeping cross-cutting selectors in one module is the Single-Responsibility
 * counterpart of the per-screen locator files: a selector that several pages
 * depend on has exactly one definition, so a UI change is a one-line edit.
 */

/** Bottom Home tab — the unambiguous marker for the app home screen.
 *  Uses the home tab's resource-id so it doesn't match the "ငွေပေး"/"Pay"
 *  text that appears as a toolbar title on other screens. */
export const HOME_TAB =
  '//*[@resource-id="com.jas.digitalkyats:id/home"]';

/** Bottom-nav Home icon — first item in the navigation bar. Confirmed via
 *  Appium Inspector. Use this to *tap* Home from any other tab; HOME_TAB
 *  above is the presence marker (matches on every tab). */
export const HOME_NAV_BUTTON =
  '(//android.widget.ImageView[@resource-id="com.jas.digitalkyats:id/navigation_bar_item_icon_view"])[1]';
export const HOME_NAV_BUTTON_UIA =
  'new UiSelector().resourceId("com.jas.digitalkyats:id/navigation_bar_item_icon_view").instance(0)';

/** AUT package identifier — used by lifecycle checks (foreground / launch). */
export const AUT_PACKAGE = 'com.jas.digitalkyats';

/** Loading / progress indicators — the UI is NOT settled while any show. */
export const LOADING_INDICATOR =
  '//android.widget.ProgressBar ' +
  '| //*[contains(@resource-id,"progress")] ' +
  '| //*[contains(@resource-id,"loading")] ' +
  '| //*[contains(@resource-id,"loader")]';

/** Error dialog the app raises when the login session has timed out. */
export const SESSION_EXPIRED =
  '//*[contains(@text,"Session Expired") or contains(@text,"session expired") ' +
  'or contains(@text,"Session expired") ' +
  'or contains(@text,"လုံခြုံရေး") or contains(@text,"အသိပေးချက်")]';
