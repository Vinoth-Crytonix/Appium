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

/**
 * Home is the SELECTED tab — i.e. the Home grid is actually showing.
 *
 * HOME_TAB above matches the bottom-nav button, which exists on every tab, so
 * it cannot distinguish "Home is showing" from "Home is reachable". The nav bar
 * renders a large label only for the selected item, so this reading "Home" is
 * proof the grid is up.
 *
 * Why it matters: the Before hook used to tap Home unconditionally, because
 * HOME_TAB's presence was never proof. On a scenario that already ENDS on Home
 * — which both profile features do — that tap is redundant, and it is the tap
 * that lands late and bounces the app back out of the screen the next scenario
 * has just navigated to. Skipping it when Home is already selected removes the
 * race at source.
 */
export const HOME_SELECTED =
  '//android.widget.TextView[@resource-id=' +
  '"com.jas.digitalkyats:id/navigation_bar_item_large_label_view" ' +
  'and (@text="Home" or @text="ပင်မ")]';

/** Bottom-nav Home icon — first item in the navigation bar. Confirmed via
 *  Appium Inspector. Use this to *tap* Home from any other tab; HOME_TAB
 *  above is the presence marker (matches on every tab). */
export const HOME_NAV_BUTTON =
  '(//android.widget.ImageView[@resource-id="com.jas.digitalkyats:id/navigation_bar_item_icon_view"])[1]';
export const HOME_NAV_BUTTON_UIA =
  'android=new UiSelector().resourceId("com.jas.digitalkyats:id/navigation_bar_item_icon_view").instance(0)';

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
