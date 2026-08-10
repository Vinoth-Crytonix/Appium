/**
 * Personal Profile locators — More → My Profile → Personal Profile, plus the
 * footer Edit affordance, the scrolled-to Email field and the Submit action.
 *
 * CONFIRMED selectors: MORE_TILE / MORE_SCREEN_HEADER are reused from the
 * Reports flow (resource-id + content-desc captured in Appium Inspector), so
 * the bottom-nav entry has exactly one definition in the suite.
 *
 * EVERYTHING BELOW THE MORE SCREEN IS INFERRED. This module follows the same
 * convention as reports.locators.ts: package-prefixed resource-id guesses
 * (com.jas.digitalkyats:id/...) OR-ed with English/Burmese text fallbacks, so
 * a run finds the element on either an id or a label. Tighten each selector to
 * the single real id once the live screens are inspected.
 */
import { REPORTS_LOCATORS } from './reports.locators';

export const PERSONAL_PROFILE_LOCATORS = {
  // ---- Home → More (confirmed, shared with the Reports flow) -------------
  MORE_TILE: REPORTS_LOCATORS.MORE_TILE,
  /** Indexed lookup of the same bottom-nav tab — cheaper to poll and click
   *  than the XPath union above, which walks the tree on every probe. */
  MORE_TILE_UIA: REPORTS_LOCATORS.MORE_TILE_UIA,

  /**
   * More screen marker — CONFIRMED in Appium Inspector.
   *
   * The bottom nav renders a "large label" for the SELECTED tab only, so this
   * node reading "More" means the More tab is genuinely active. Captured on the
   * Home screen the same node reads text="Home" selected="true", which is what
   * makes it a reliable discriminator rather than something present on every
   * screen.
   *
   * Preferred over the Reports flow's toolbar-title marker: that one looks for
   * a `toolbar_title_text`/`more_title` id which this build does not render on
   * the More tab, so it can never match here.
   */
  MORE_SCREEN_HEADER:
    '//android.widget.TextView[@resource-id="com.jas.digitalkyats:id/navigation_bar_item_large_label_view" ' +
    'and (@text="More" or @text="အသေးစိတ်")]',

  // ---- "My Profile" row inside More --------------------------------------
  /**
   * CONFIRMED in Appium Inspector: the row label is a TextView with
   * resource-id `id/title` and text "My Profile".
   *
   * The clickable ancestor is tried first — a list-row label is usually inside
   * the tappable container rather than being it, and clicking a non-clickable
   * TextView lands on whatever is underneath. The bare label is kept as the
   * fallback for builds where the TextView itself carries the click.
   */
  MY_PROFILE_OPTION:
    '//*[@clickable="true" and .//android.widget.TextView' +
    '[@resource-id="com.jas.digitalkyats:id/title" and @text="My Profile"]] ' +
    '| //android.widget.TextView[@resource-id="com.jas.digitalkyats:id/title" and @text="My Profile"]',

  /**
   * The row's LABEL alone — used as the readiness check before tapping.
   *
   * The tappable form above is a clickable ancestor, and an ancestor can exist
   * in the tree before its label has drawn; waiting on the label itself is what
   * proves the row is actually rendered.
   */
  MY_PROFILE_LABEL:
    '//android.widget.TextView[@resource-id="com.jas.digitalkyats:id/title" and @text="My Profile"]',

  MY_PROFILE_SCREEN_HEADER:
    '//*[contains(@resource-id,"toolbar_title_text") and (contains(@text,"My Profile") or contains(@text,"ပရိုဖိုင်"))] ' +
    '| //*[contains(@resource-id,"my_profile")] ' +
    '| //*[@text="Personal Profile" or contains(@text,"ကိုယ်ရေးအချက်အလက်")]',

  // ---- "Personal Profile" row inside My Profile --------------------------
  PERSONAL_PROFILE_OPTION:
    '//*[@clickable="true" and .//*[contains(@text,"Personal Profile") or contains(@text,"ကိုယ်ရေးအချက်အလက်")]] ' +
    '| //*[contains(@text,"Personal Profile") or contains(@text,"ကိုယ်ရေးအချက်အလက်")]',

  /**
   * CONFIRMED from a live page dump: this screen's toolbar title is
   * `id/txt_title` reading "Personal Profile" — NOT the `toolbar_title_text`
   * id the other flows use. The screen had rendered correctly all along; only
   * this marker was wrong, which is why the step failed while the profile form
   * (Account Number, NRC Number, Father Name...) was plainly on screen.
   */
  PERSONAL_PROFILE_SCREEN_HEADER:
    '//android.widget.TextView[@resource-id="com.jas.digitalkyats:id/txt_title" ' +
    'and (@text="Personal Profile" or contains(@text,"ကိုယ်ရေးအချက်အလက်"))]',

  // ---- Scrollable profile form ------------------------------------------
  PROFILE_SCROLL_CONTAINER:
    '//*[@scrollable="true"] ' +
    '| //*[contains(@resource-id,"profile_scroll") or contains(@class,"ScrollView")]',

  // ---- Edit icon in the FOOTER of Personal Profile -----------------------
  // The footer affordance, not a toolbar pencil: the XPath prefers an id/
  // content-desc match and falls back to the last clickable image on screen.
  /**
   * CONFIRMED in Appium Inspector: `id/img_edit`, an ImageView.
   *
   * The guessy union this replaced was actively dangerous — its last branch
   * ("the last clickable ImageView on screen") would happily tap whatever
   * unrelated icon happened to sort last, and its first branch matched any id
   * merely CONTAINING "edit". Both could pass while tapping the wrong thing.
   *
   * The ImageView itself may not carry the click on every build, so a clickable
   * ancestor is tried first and the icon itself is the fallback.
   */
  FOOTER_EDIT_ICON:
    '//*[@clickable="true" and .//android.widget.ImageView' +
    '[@resource-id="com.jas.digitalkyats:id/img_edit"]] ' +
    '| //android.widget.ImageView[@resource-id="com.jas.digitalkyats:id/img_edit"]',

  /** The icon regardless of position — used to wait for the form to finish
   *  rendering before any scrolling is attempted. */
  FOOTER_EDIT_ICON_ANY:
    '//*[@resource-id="com.jas.digitalkyats:id/img_edit"]',

  /**
   * Indexed lookup of the same icon — for POLLING and clicking.
   *
   * FOOTER_EDIT_ICON is an XPath union with a descendant predicate
   * (`//*[@clickable and .//ImageView[...]]`), which makes UiAutomator walk the
   * whole tree; on this long profile form that measured ~38s per cycle once it
   * was probed several times per tap — a third of the entire flow. A
   * resourceId UiSelector is an indexed lookup instead, and the icon carries
   * the click itself on this build, so the clickable-ancestor form is not
   * needed for the tap.
   *
   * Native form only — the WebView tree that crashes UiAutomator2 is not
   * involved on this screen.
   */
  FOOTER_EDIT_ICON_UIA:
    'android=new UiSelector().resourceId("com.jas.digitalkyats:id/img_edit")',

  /**
   * Scroll straight to the Edit icon — UiAutomator scrolls on the device.
   *
   * Same technique as EMAIL_FIELD_SCROLL_TO: finding this selector performs the
   * scroll in one command, instead of the generic loop's blind swipe-and-probe.
   * That loop was the failure mode here — on a freshly opened profile the form
   * is still fetching, so it swiped down and back up over a half-rendered
   * screen and left the icon out of view, and the click then timed out.
   */
  FOOTER_EDIT_ICON_SCROLL_TO:
    'android=new UiScrollable(new UiSelector().scrollable(true)).setMaxSearchSwipes(12)' +
    '.scrollIntoView(new UiSelector().resourceId("com.jas.digitalkyats:id/img_edit"))',

  // Marker that edit mode is live — the form's fields become enabled.
  // ---- "Which fields are editable" gate ----------------------------------
  // CONFIRMED from a live dump: the footer Edit icon does NOT open edit mode
  // directly. It raises a dialog — "Verified Level-2 personal account profile
  // / Only following fields are editable: Email, Facebook / To edit other
  // fields please contact OK$ customer care" — with Cancel and Edit buttons.
  // Edit mode only starts once its Edit button is tapped.

  /**
   * The gate dialog's own Edit button.
   *
   * TWO id variants, both CONFIRMED from live dumps — the same dialog is built
   * differently per profile type:
   *   Personal Profile -> `button1_edit`  (beside `button_cancel_edit`)
   *   Business Profile -> `button_edit`   (beside `button_cancel`)
   * Listed as exact ids rather than a contains() wildcard, which would also
   * swallow the Cancel buttons.
   */
  EDIT_CONFIRM_BUTTON:
    '//*[@resource-id="com.jas.digitalkyats:id/button1_edit"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/button_edit"]',

  /** Presence of the gate dialog, so the tap is only made when it is up. */
  EDIT_CONFIRM_DIALOG:
    '//*[@resource-id="com.jas.digitalkyats:id/button1_edit"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/button_edit"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/txt_edit_message_editable"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/ctv_customer_care"]',

  /**
   * Edit mode is live. Deliberately does NOT match the gate dialog: that
   * dialog's buttons are `button1_edit` / `button_cancel_edit`, so keying off
   * anything containing "edit" would report success while the gate was still
   * on screen — which is precisely how this step passed for the wrong reason
   * before the dialog was understood.
   */
  // NOTE: an editable field ONLY. The earlier "or any id containing
  // btn_submit/button_submit/save" branch is gone: `button_submit` turned out
  // to be the "Are you sure you want to update?" dialog's Update button, so
  // that branch would report edit mode while a confirmation dialog was up —
  // and would keep waitForSubmitAccepted()'s "form returned to read-only"
  // check from ever going false.
  EDIT_MODE_MARKER: '//android.widget.EditText[@enabled="true"]',

  // ---- "Are you sure you want to update?" confirmation -------------------
  // CONFIRMED from a live dump: Submit does not commit directly, it raises a
  // second dialog (`txt_title_submit`) with Cancel / Update buttons.

  /**
   * The confirmation's commit button.
   *
   * TWO id variants, both CONFIRMED from live dumps — as with the edit gate,
   * the same dialog is built differently per profile type:
   *   Personal ("Are you sure you want to update?") -> `button_submit`
   *   Business ("Are you sure you want to submit?") -> `button_edit_logo`
   * Exact ids only: `button_edit_logo` sits beside `button_cancel_logo`, so a
   * contains() wildcard on "edit" or "logo" would risk tapping Cancel.
   */
  SUBMIT_CONFIRM_BUTTON:
    '//*[@resource-id="com.jas.digitalkyats:id/button_submit"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/button_edit_logo"]',

  /** Presence of that confirmation, so commit is only tapped when it is up. */
  SUBMIT_CONFIRM_DIALOG:
    '//*[@resource-id="com.jas.digitalkyats:id/button_submit"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/txt_title_submit"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/button_edit_logo"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/txt_verify_logo"]',

  /**
   * The acknowledgement popup that follows a committed update — tapping OK
   * closes it and the app returns to the profile/home.
   *
   * INFERRED: its id has not been captured yet, so this matches on the OK
   * label plus the usual dialog-button ids. Deliberately anchored to the OK
   * TEXT rather than "any dialog button", so it cannot pick up the Cancel side
   * of a dialog. Replace with the confirmed id once inspected.
   */
  SUBMIT_OK_BUTTON:
    '//*[@resource-id="android:id/button1"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/button_ok" ' +
    'or @resource-id="com.jas.digitalkyats:id/btn_ok"] ' +
    '| //*[(@text="OK" or @text="Ok" or @text="ok" or @text="ရပါပြီ") and ' +
    '(@clickable="true" or self::android.widget.Button or self::android.widget.TextView)]',

  // ---- Email field -------------------------------------------------------
  // Sits below the fold; reached via scrollToEmailField(). Label-anchored
  // first (survives an id rename), then id, then a bare email-shaped EditText.
  EMAIL_LABEL:
    '//*[@text="Email" or @text="Email Address" or @text="E-mail" or contains(@text,"အီးမေး")]',

  EMAIL_FIELD:
    '//*[contains(@resource-id,"email")][self::android.widget.EditText] ' +
    '| //*[contains(@resource-id,"email")]//android.widget.EditText ' +
    '| //android.widget.EditText[contains(@text,"@") or contains(@hint,"mail") or contains(@hint,"Mail")]',

  // Fast UiSelector probe for poll loops (indexed lookup, no tree walk).
  EMAIL_FIELD_UIA:
    'android=new UiSelector().resourceIdMatches(".*email.*").className("android.widget.EditText")',

  /**
   * Scroll straight to the email field — UiAutomator does the scrolling itself.
   *
   * Simply FINDING this selector performs the scroll: UiScrollable swipes the
   * container until the target is on screen, entirely on the device. That
   * replaces the generic swipe loop, which costs a swipe + a 600ms settle + an
   * XPath probe per step and was being run twice per cycle (once for the label,
   * once for the field).
   *
   * Safe here, unlike the Voucher module: this form is native, and the WebView
   * accessibility tree that crashes UiAutomator2 is not involved.
   */
  EMAIL_FIELD_SCROLL_TO:
    'android=new UiScrollable(new UiSelector().scrollable(true)).setMaxSearchSwipes(12)' +
    '.scrollIntoView(new UiSelector().resourceIdMatches(".*email.*")' +
    '.className("android.widget.EditText"))',

  // ---- Submit ------------------------------------------------------------
  /**
   * The FORM's submit control.
   *
   * Deliberately excludes the two confirmation-dialog buttons. `button_submit`
   * (Personal) and `button_edit_logo` (Business) are the "Are you sure…?"
   * dialog's own commit buttons, and the old `contains(@resource-id,
   * "button_submit")` branch matched them — so if that dialog were ever on
   * screen when the form submit was requested, this selector would tap the
   * dialog instead. It has not bitten yet only because the ordering happens to
   * avoid it; the exclusion makes that structural rather than lucky.
   */
  SUBMIT_BUTTON:
    '//*[contains(@resource-id,"btn_submit") or contains(@resource-id,"button_submit") ' +
    'or contains(@resource-id,"save")] ' +
    '| //*[@clickable="true" and .//*[@text="Submit" or @text="Save" or @text="Update" ' +
    'or contains(@text,"သိမ်းဆည်း")]] ' +
    '| //*[@text="Submit" or @text="Save" or @text="Update" or contains(@text,"သိမ်းဆည်း")]',

  // Success signal after submit — a toast/dialog, or the form dropping back
  // to read-only (the Edit icon is offered again).
  SUBMIT_SUCCESS:
    '//*[contains(@text,"Success") or contains(@text,"success") ' +
    'or contains(@text,"Updated") or contains(@text,"updated") ' +
    'or contains(@text,"အောင်မြင်")]',
} as const;
