/**
 * Merchant Payment flow locators (resource-ids captured from the running AUT).
 */

import { HOME_TAB } from './common.locators';

const PKG = 'com.jas.digitalkyats';

export const MERCHANT_LOCATORS = {
  HOME_TAB,

  // ----- Home screen ----------------------------------------------------
  // The "Merchant Payment" label TextView is not clickable itself — only its
  // parent tile is. Match a clickable ancestor that contains the label.
  MERCHANT_PAYMENT_TILE:
    '//*[@clickable="true" and .//*[@text="Merchant Payment" or contains(@text,"ကုန်သည်")]] ' +
    '| //*[@content-desc="Merchant Payment" and @clickable="true"] ' +
    '| //*[contains(@resource-id,"merchant") and @clickable="true"]',

  // ----- Toolbar (shared between Category and List screens) -------------
  TOOLBAR_TITLE: `//*[@resource-id="${PKG}:id/toolbar_title_text"]`,
  TOOLBAR_BACK_BUTTON: `//*[@resource-id="${PKG}:id/toolbar1"]/android.widget.ImageButton[1]`,

  // ----- Merchant Category screen --------------------------------------
  // Locale-agnostic — accept the English or Burmese toolbar title.
  MERCHANT_CATEGORY_MARKER:
    `//*[@resource-id="${PKG}:id/toolbar_title_text" and (@text="Merchant Category" or contains(@text,"အမျိုးအစား"))]`,

  // Search widget (same widget on Category and List screens).
  SEARCH_ICON: `//*[@resource-id="${PKG}:id/search112"]`,
  SEARCH_FIELD: `//*[@resource-id="${PKG}:id/searchTextView"]`,
  /** Back-arrow on the search bar (closes the search overlay). */
  SEARCH_CLOSE: `//*[@resource-id="${PKG}:id/action_up_btn"]`,
  /** X button inside the search bar — clears the typed text. */
  SEARCH_CLEAR_X: `//*[@resource-id="${PKG}:id/action_empty_btn"]`,

  // Category / merchant list items are Compose views — clickable android.view.View
  // that has a TextView child holding the displayed name.
  ITEM_ANY:
    '//androidx.compose.ui.platform.ComposeView' +
    '//android.view.View[@clickable="true" and .//android.widget.TextView]',
  /** Build a selector for an item by displayed text (partial match). */
  ITEM_BY_TEXT: (text: string) =>
    `//androidx.compose.ui.platform.ComposeView` +
    `//android.view.View[@clickable="true" and .//android.widget.TextView` +
    `[contains(translate(@text,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),` +
    `"${text.toLowerCase()}")]]`,

  NO_RECORDS:
    '//*[contains(@text,"No record") or contains(@text,"No Record") ' +
    'or contains(@text,"No data") or contains(@text,"No result") ' +
    'or contains(@text,"No Result") or contains(@text,"not found") ' +
    'or contains(@text,"Not Found") or contains(@text,"စာရင်းမရှိ")]',

  // ----- Merchant List screen ------------------------------------------
  // Match either explicit English/Burmese title, or any non-Category title in
  // the toolbar (post-category-tap, the title changes to the merchant list).
  MERCHANT_LIST_MARKER:
    `//*[@resource-id="${PKG}:id/toolbar_title_text" and (@text="Merchant List" or contains(@text,"မှတ်တမ်း") or contains(@text,"List"))]`,

  // ----- Payment Details (Pay) screen ----------------------------------
  PAY_SCREEN_MARKER:
    `//*[@resource-id="${PKG}:id/new_send_money_amount"]`,
  AMOUNT_FIELD:
    `//*[@resource-id="${PKG}:id/new_send_money_amount"] ` +
    '| //android.widget.EditText[contains(@hint,"Amount") or contains(@hint,"amount")]',
  REFERENCE_FIELD:
    '//android.widget.EditText[contains(@hint,"Reference") or contains(@hint,"reference") ' +
    'or contains(@hint,"Ref")] ' +
    `| //*[contains(@resource-id,"reference") and contains(@class,"EditText")] ` +
    `| //*[contains(@resource-id,"refId") and contains(@class,"EditText")] ` +
    `| //*[contains(@resource-id,"ref_id") and contains(@class,"EditText")]`,
  REMARKS_FIELD:
    `//*[@resource-id="${PKG}:id/new_send_money_comment"] ` +
    '| //android.widget.EditText[contains(@hint,"Remark") or contains(@hint,"remark") ' +
    'or contains(@hint,"Note")]',

  // ----- Amount-field controls (close-X clears) ------------------------
  AMOUNT_CLOSE_BUTTON: `//*[@resource-id="${PKG}:id/sendmoney_image_crossamount"]`,

  // ----- Attachment flow -----------------------------------------------
  ATTACH_FILE_BUTTON:
    '//*[@text="Attach File" or @text="Attach" or @content-desc="Attach File"] ' +
    '| //*[contains(@resource-id,"attach") and @clickable="true"]',
  /** "+" button to add another attachment. */
  ADD_ANOTHER_ATTACHMENT_BUTTON: `//*[@resource-id="${PKG}:id/add"]`,
  GALLERY_OPTION:
    `//*[@resource-id="${PKG}:id/gallery_layout"] ` +
    '| //*[@text="Gallery" or @text="GALLERY" or @content-desc="Gallery"] ' +
    '| //*[contains(@resource-id,"gallery") and @clickable="true"]',
  CAMERA_OPTION:
    `//*[@resource-id="${PKG}:id/camera_layout"] ` +
    '| //*[@text="Camera" or @text="CAMERA" or @content-desc="Camera"] ' +
    '| //*[contains(@resource-id,"camera") and @clickable="true"]',
  /** The chooser dialog (Gallery / Camera rows) is on screen. */
  ATTACHMENT_CHOOSER_MARKER:
    `//*[@resource-id="${PKG}:id/gallery_layout" or @resource-id="${PKG}:id/camera_layout"]`,
  GALLERY_DONE_BUTTON:
    '//*[(@text="Done" or @text="DONE" or @content-desc="Done") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"done") and @clickable="true"]',
  GALLERY_FIRST_IMAGE:
    '//android.widget.GridView//*[@clickable="true"][1] ' +
    '| //androidx.recyclerview.widget.RecyclerView//*[@clickable="true"][1] ' +
    '| //*[contains(@resource-id,"thumbnail")][1] ' +
    '| //*[contains(@resource-id,"icon") and contains(@class,"ImageView")][1]',
  /** Delete (X) button on the second attached file (the only delete_button on screen). */
  ATTACHMENT_DELETE_BUTTON_2ND:
    `//*[@resource-id="${PKG}:id/attachment2"]//*[@resource-id="${PKG}:id/delete_button"] ` +
    `| //*[@resource-id="${PKG}:id/delete_button"]`,

  SUBMIT_BUTTON:
    `//*[@resource-id="${PKG}:id/new_send_money_submit_button"] ` +
    '| //*[(@text="Submit" or @text="SUBMIT") and @clickable="true"]',

  // ----- Confirmation screen -------------------------------------------
  CONFIRMATION_MARKER:
    '//*[contains(@text,"Confirmation") or contains(@text,"Confirm")] ' +
    '| //*[contains(@resource-id,"confirm")]',
  // The Pay form screen's toolbar title is also "ငွေပေး" (a TextView, not
  // clickable) — require @clickable="true" so we only match the Confirmation
  // screen's actual Pay action button.
  PAY_BUTTON:
    '//*[(@text="Pay" or @text="PAY" or @text="ငွေပေး" or @text="ပေးချေမည်") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Pay" or @text="PAY" or @text="ငွေပေး"] ' +
    '| //*[contains(@resource-id,"pay") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"confirm") and @clickable="true"]',
  SESSION_EXPIRED_OK:
    '//*[(@text="OK" or @text="Ok" or @text="ok" or @text="လုပ်ပါ") and @clickable="true"] ' +
    '| //*[@text="လုပ်ပါ"] ' +
    '| //android.widget.Button[@text="OK" or @text="Ok"]',

  // ----- Receipt screen -------------------------------------------------
  RECEIPT_MARKER:
    '//*[contains(@text,"Receipt") or contains(@text,"Successful") ' +
    'or contains(@text,"Success") or contains(@text,"ပြေစာ")]',
  SHARE_BUTTON:
    '//*[(@text="Share" or @text="SHARE" or @text="မျှဝေ" or @content-desc="Share") and @clickable="true"] ' +
    '| //*[contains(@text,"မျှဝေ") and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="မျှဝေ" or @text="Share"]] ' +
    '| //*[contains(@resource-id,"share") and @clickable="true"]',
  BACK_TO_HOME_BUTTON:
    '//*[(@text="Back To Home" or @text="Back to Home" or @text="BACK TO HOME" ' +
    'or @text="Home" or @text="HOME") and @clickable="true"] ' +
    '| //*[contains(@text,"ပင်မ") and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[contains(@text,"ပင်မ") or contains(@text,"Home")]] ' +
    '| //*[contains(@resource-id,"home") and @clickable="true"]',
} as const;
