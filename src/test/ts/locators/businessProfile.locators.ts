/**
 * Business Profile locators — More → My Profile → Business Profile, the footer
 * Edit affordance, the Add Business Photo control and the Submit action.
 *
 * Everything from Home down to My Profile is IDENTICAL to the Personal Profile
 * flow, and so are the edit gate, the update confirmation and the OK popup —
 * they are app-wide profile controls, not screen-specific ones. Those are
 * re-exported from PERSONAL_PROFILE_LOCATORS rather than copied, so each
 * control keeps exactly ONE definition in the suite: when a build renames
 * `id/img_edit` or `id/button_submit`, both flows follow from a single edit.
 *
 * Only the genuinely Business-specific selectors are declared here.
 */
import { PERSONAL_PROFILE_LOCATORS as P } from './personalProfile.locators';

export const BUSINESS_PROFILE_LOCATORS = {
  // ---- Shared with the Personal Profile flow (all CONFIRMED there) --------
  MORE_TILE: P.MORE_TILE,
  MORE_SCREEN_HEADER: P.MORE_SCREEN_HEADER,
  MY_PROFILE_OPTION: P.MY_PROFILE_OPTION,
  MY_PROFILE_SCREEN_HEADER: P.MY_PROFILE_SCREEN_HEADER,

  FOOTER_EDIT_ICON: P.FOOTER_EDIT_ICON,
  EDIT_CONFIRM_BUTTON: P.EDIT_CONFIRM_BUTTON,
  EDIT_CONFIRM_DIALOG: P.EDIT_CONFIRM_DIALOG,

  SUBMIT_BUTTON: P.SUBMIT_BUTTON,
  SUBMIT_CONFIRM_BUTTON: P.SUBMIT_CONFIRM_BUTTON,
  SUBMIT_CONFIRM_DIALOG: P.SUBMIT_CONFIRM_DIALOG,
  SUBMIT_OK_BUTTON: P.SUBMIT_OK_BUTTON,
  SUBMIT_SUCCESS: P.SUBMIT_SUCCESS,

  // ---- "Business Profile" row inside My Profile --------------------------
  /**
   * INFERRED, but modelled on the CONFIRMED "My Profile" row: that row is a
   * TextView `id/title` inside a clickable container, so its sibling rows
   * almost certainly are too. The clickable ancestor is tried first for the
   * same reason — tapping a bare TextView lands on whatever is underneath.
   * A plain text match is the last resort in case this row is built
   * differently.
   */
  BUSINESS_PROFILE_OPTION:
    '//*[@clickable="true" and .//android.widget.TextView' +
    '[@resource-id="com.jas.digitalkyats:id/title" and @text="Business Profile"]] ' +
    '| //android.widget.TextView[@resource-id="com.jas.digitalkyats:id/title" ' +
    'and @text="Business Profile"] ' +
    '| //*[@clickable="true" and .//*[contains(@text,"Business Profile")]] ' +
    '| //*[contains(@text,"Business Profile")]',

  /**
   * INFERRED from the CONFIRMED Personal Profile header: that screen titles
   * itself with `id/txt_title`, not the `toolbar_title_text` the other flows
   * use, so its sibling screen is expected to do the same. A looser
   * "any node whose text is Business Profile" branch backs it up.
   */
  BUSINESS_PROFILE_SCREEN_HEADER:
    '//android.widget.TextView[@resource-id="com.jas.digitalkyats:id/txt_title" ' +
    'and (@text="Business Profile" or contains(@text,"လုပ်ငန်း"))] ' +
    '| //*[@text="Business Profile"]',

  // ---- "Add Business Photo" ----------------------------------------------
  /**
   * INFERRED: sits below the fold in edit mode and is scrolled to before use.
   * Text-anchored because no id has been captured — matched on the full label
   * so it cannot collide with a bare "Photo"/"Add" control elsewhere on the
   * form. Replace with the confirmed id once inspected.
   */
  ADD_BUSINESS_PHOTO:
    '//*[@clickable="true" and .//*[contains(@text,"Add Business Photo")]] ' +
    '| //*[contains(@text,"Add Business Photo")] ' +
    '| //*[contains(@content-desc,"Add Business Photo")]',
} as const;
