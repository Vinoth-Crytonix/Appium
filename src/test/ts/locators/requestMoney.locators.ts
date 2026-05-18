import { HOME_TAB } from './common.locators';

/** Request Money flow locators. */
export const REQUEST_MONEY_LOCATORS = {
  // Home tile.
  REQUEST_MONEY_TILE:
    '//android.widget.TextView[@text="Request Money" or @text="ငွေတောင်းခံခြင်း"] ' +
    '| //*[contains(@content-desc,"Request Money") or contains(@content-desc,"ငွေတောင်း")]',

  // Option screen after tapping the tile (Enter Mobile Number / Scan QR / ...).
  ENTER_MOBILE_OPTION:
    '//*[@text="Enter Mobile Number" or @text="ဖုန်းနံပါတ်ဖြင့်" ' +
    'or contains(@text,"Mobile Number") or contains(@text,"ဖုန်းနံပါတ်")] ' +
    '| //*[contains(@content-desc,"Mobile Number") or contains(@content-desc,"ဖုန်းနံပါတ်")]',

  // Mobile number field (hint: "Enter Request Money Number").
  MOBILE_FIELD: '//*[@resource-id="com.jas.digitalkyats:id/clearable_editText"]',

  // "Select Request For" dropdown — labelled "select_deposit_by_layout" in the AUT.
  REQUEST_FOR_DROPDOWN:
    '//*[@resource-id="com.jas.digitalkyats:id/select_deposit_by_layout"]',
  OK_MONEY_OPTION:
    '//*[@text="OK $ Money" or @text="OK$ Money" or @text="OK Money" ' +
    'or @text="OK $ ပိုက်ဆံ" ' +
    'or contains(@text,"OK $ Money") or contains(@text,"OK $ ပိုက်ဆံ")]',

  // Amount + Remarks (real input fields after OK$ Money is selected).
  // NB: "amount" resource-id is the read-only label of an existing pending
  // request; the real input is "amount_new".
  AMOUNT_FIELD:
    '//*[@resource-id="com.jas.digitalkyats:id/amount_new"] ' +
    '| //android.widget.EditText[contains(@hint,"Enter Amount")]',
  REMARKS_FIELD:
    '//android.widget.EditText[@resource-id="com.jas.digitalkyats:id/remark"] ' +
    '| //android.widget.EditText[contains(@hint,"Enter Remarks") or contains(@hint,"Remark")]',

  // Attach file — the LinearLayout that opens the Gallery/Camera chooser.
  ATTACH_BUTTON:
    '//*[@resource-id="com.jas.digitalkyats:id/attachment2"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/attached_image"]',
  GALLERY_OPTION:
    '//*[@text="Gallery" or @text="ပုံများ" or @text="Photos" or @text="ဂယ်လာရီ" ' +
    'or @text="ပုံ" or @text="ဓာတ်ပုံ" or @text="ပုံ ပြခန်း" ' +
    'or contains(@text,"Gallery") or contains(@text,"ပုံ")] ' +
    '| //*[contains(@resource-id,"gallery")]',

  // Marker proving the Request Money form is back after gallery selection.
  BACK_ON_FORM_MARKER:
    '//*[@resource-id="com.jas.digitalkyats:id/delete_button"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/add"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/radio_req"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/button1"]',

  // Request Now radio — resource-id is language-independent; text fallbacks
  // for both English and Burmese.
  REQUEST_NOW_RADIO:
    '//*[@resource-id="com.jas.digitalkyats:id/radio_req"] ' +
    '| //android.widget.RadioButton[@text="Request Now" or contains(@text,"Request Now") ' +
    'or contains(@text,"ယခု") or contains(@text,"တောင်းခံ")]',

  // Submit — on the Request Money form this is "button1" with Burmese "ပေးပို့".
  SUBMIT_BUTTON:
    '//*[@resource-id="com.jas.digitalkyats:id/button1"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/new_send_money_submit_button"] ' +
    '| //android.widget.Button[@text="Submit" or @text="SUBMIT" or @text="ပေးပို့" or @text="တင်ပေးရန်"] ' +
    '| //*[(@text="Submit" or @text="SUBMIT" or @text="ပေးပို့") and @clickable="true"]',

  // OK / confirm button on popups. In Burmese the "Yes/OK" button is
  // "လုပ်ပါ" ("do it"); cancel is "မလုပ်ပါ" ("don't").
  OK_BUTTON:
    '//android.widget.Button[@text="OK" or @text="Ok" or @text="ok" ' +
    'or @text="ဟုတ်ကဲ့" or @text="လုပ်ပါ"] ' +
    '| //*[(@text="OK" or @text="Ok" or @text="လုပ်ပါ") and @clickable="true"]',

  // Home tab (used by the back-to-home assertion).
  HOME_TAB,
} as const;
