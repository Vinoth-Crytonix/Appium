import { HOME_TAB } from './common.locators';

/**
 * Electricity Bill Payment flow locators.
 *
 * The flow branches twice:
 *   1. Meter number entry -> either Computer Code field appears (duplicate
 *      meter) or Meter Type dropdown appears (non-duplicate).
 *   2. Meter type "My Meter" hides the Contact Number requirement; "Other
 *      Meter" requires it.
 *
 * Selectors are heuristic (text + resource-id contains). Swap exact ids in
 * via Appium Inspector once confirmed.
 */
export const ELECTRICITY_LOCATORS = {
  HOME_TAB,

  // Home tile — Burmese tile label uses "လျှပ်စစ်" (Electricity); the suffix
  // varies ("မီတာခ" with/without a space). Match on the unique prefix.
  ELECTRICITY_TILE:
    '//*[@clickable="true" and .//*[contains(@text,"လျှပ်စစ်") or @text="Electricity" or @text="ELECTRICITY"]] ' +
    '| //*[(contains(@text,"လျှပ်စစ်") or @text="Electricity" or @text="ELECTRICITY") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"electricity") and @clickable="true"] ' +
    '| //*[@content-desc="Electricity" or contains(@content-desc,"လျှပ်စစ်")]',

  // Bill Payment screen marker — restrict to the toolbar title (resource-id)
  // so we don't false-match the Home tile that has similar Burmese text.
  BILL_PAYMENT_HEADER:
    '//*[@resource-id="com.jas.digitalkyats:id/toolbar_title_text" ' +
    'and (contains(@text,"Electricity Bill") or contains(@text,"လျှပ်စစ်"))] ' +
    '| //*[contains(@resource-id,"electricity_title") and contains(@text,"Electricity")]',

  // Form fields.
  // The actual EditText has the et_ prefix; the bare "meter_number" id is a
  // non-input wrapper layout we must NOT match.
  METER_NUMBER_FIELD:
    '//*[@resource-id="com.jas.digitalkyats:id/et_meter_number"] ' +
    '| //*[contains(@resource-id,"et_meter") and contains(@class,"EditText")] ' +
    '| //android.widget.EditText[contains(@hint,"Meter")]',
  COMPUTER_CODE_FIELD:
    '//android.widget.EditText[contains(@resource-id,"computer_code") or contains(@resource-id,"comp_code") ' +
    'or contains(@resource-id,"et_computer") or contains(@resource-id,"et_comp")] ' +
    '| //android.widget.EditText[contains(@hint,"Computer") or contains(@hint,"computer")] ' +
    '| //*[contains(@text,"Computer Code")]/following-sibling::android.widget.EditText[1] ' +
    '| //*[contains(@text,"Computer Code")]/..//android.widget.EditText[1]',
  /** Marker: a label/text saying "Computer Code" indicates the duplicate flow. */
  COMPUTER_CODE_LABEL:
    '//*[contains(@text,"Computer Code") or contains(@text,"Computer code") ' +
    'or contains(@text,"ကွန်ပျူတာကုဒ်")]',
  LEDGER_NUMBER_FIELD:
    '//android.widget.EditText[contains(@resource-id,"ledger") or contains(@resource-id,"ledger_no") ' +
    'or contains(@resource-id,"et_ledger")] ' +
    '| //android.widget.EditText[contains(@hint,"Ledger") or contains(@hint,"ledger")] ' +
    '| //*[contains(@text,"Ledger")]/..//android.widget.EditText[1]',
  CONTACT_NUMBER_FIELD:
    '//android.widget.EditText[contains(@resource-id,"contact_number") or contains(@resource-id,"contact_no") ' +
    'or contains(@resource-id,"mobile_number") or contains(@resource-id,"et_contact") or contains(@resource-id,"et_mobile")] ' +
    '| //android.widget.EditText[contains(@hint,"Contact") or contains(@hint,"Phone")] ' +
    '| //*[contains(@text,"Contact")]/..//android.widget.EditText[1]',
  REMARKS_FIELD:
    '//android.widget.EditText[contains(@resource-id,"remark") or contains(@resource-id,"comment") ' +
    'or contains(@resource-id,"note") or contains(@resource-id,"et_remark")] ' +
    '| //android.widget.EditText[contains(@hint,"Remark") or contains(@hint,"remark")] ' +
    '| //*[contains(@text,"Remark")]/..//android.widget.EditText[1]',

  // Meter type dropdown (appears after entering a non-duplicate meter number).
  // Accept any clickable element exposing "My Meter" / "Other Meter" labels,
  // OR a Spinner, OR a clickable element whose descendants contain those labels.
  METER_TYPE_DROPDOWN:
    '//*[contains(@resource-id,"meter_type") and @clickable="true"] ' +
    '| //android.widget.Spinner[contains(@resource-id,"meter")] ' +
    '| //*[@clickable="true" and (.//*[@text="My Meter"] or .//*[@text="Other Meter"])] ' +
    '| //*[(@text="My Meter" or @text="Other Meter") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"spinner_meter") or contains(@resource-id,"meter_type_dropdown")]',
  METER_TYPE_OPTION_MY:
    '//*[(@text="My Meter" or @text="MY METER" or contains(@text,"ကိုယ်ပိုင်")) and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="My Meter" or @text="MY METER" or contains(@text,"ကိုယ်ပိုင်")]] ' +
    '| //*[@text="My Meter" or @text="MY METER" or contains(@text,"ကိုယ်ပိုင်")]',
  METER_TYPE_OPTION_OTHER:
    '//*[(@text="Other Meter" or @text="OTHER METER" or contains(@text,"အခြား")) and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="Other Meter" or @text="OTHER METER" or contains(@text,"အခြား")]] ' +
    '| //*[@text="Other Meter" or @text="OTHER METER" or contains(@text,"အခြား")]',

  // Favourite checkbox.
  ADD_TO_FAVOURITES_CHECKBOX:
    '//android.widget.CheckBox[contains(@text,"Favourite") or contains(@text,"Favorite")] ' +
    '| //*[contains(@resource-id,"favourite") or contains(@resource-id,"favorite")]',

  // Action buttons.
  GET_BILL_BUTTON:
    '//*[(contains(@text,"Get Bill") or contains(@text,"GET BILL") or contains(@text,"ဘီလ်") or contains(@text,"ပြေစာ")) and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[contains(@text,"Get Bill") or contains(@text,"GET BILL") or contains(@text,"ဘီလ်ရယူ") or contains(@text,"ပြေစာရယူ")]] ' +
    '| //*[contains(@resource-id,"get_bill") and @clickable="true"]',
  // The Proceed-to-Pay button on the Summary screen carries the amount text
  // too — e.g. "Proceed to Pay 1,500 MMK". Match with contains() and ascend
  // to a clickable ancestor if the text itself isn't clickable.
  // Proceed-to-Pay button. Burmese text confirmed on Payment Summary screen:
  // "<amount> MMK ပေးရန် ဆက်လက် လုပ်ဆောင်ပါ။" — match by the unique fragment
  // "ဆက်လက် လုပ်ဆောင်" (proceed-continue). English keeps "Proceed to Pay".
  PROCEED_TO_PAY_BUTTON:
    '//*[(contains(@text,"Proceed to Pay") or contains(@text,"PROCEED TO PAY") ' +
    'or contains(@text,"ဆက်လက်") or contains(@text,"လုပ်ဆောင်ပါ")) and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[contains(@text,"Proceed to Pay") or contains(@text,"PROCEED TO PAY") ' +
    'or contains(@text,"ဆက်လက်") or contains(@text,"လုပ်ဆောင်ပါ")]] ' +
    '| //*[contains(@resource-id,"proceed_to_pay") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"proceed_pay") and @clickable="true"]',

  // Screens reached during the flow.
  // Payment Summary screen — English title or the Burmese "ငွေပေးချေမှု
  // အချက်အလက်" (Payment Information) section header that's unique to this
  // screen on this build.
  PAYMENT_SUMMARY_HEADER:
    '//*[(@text="Payment Summary" or contains(@text,"Summary") ' +
    'or contains(@text,"ပေးချေမှု အချက်") or contains(@text,"အကျဉ်းချုပ်") ' +
    'or contains(@text,"ပေးငွေ")) ' +
    'and (@class="android.widget.TextView" or contains(@resource-id,"title"))]',
  PAYMENT_RECEIPT_HEADER:
    '//*[(@text="Payment Receipt" or @text="Receipt" or contains(@text,"Receipt")) ' +
    'and (@class="android.widget.TextView" or contains(@resource-id,"title"))]',

  // Receipt actions.
  // Download Receipt — English plus Burmese fallbacks. The Burmese label
  // typically contains "ပြေစာ" (receipt) and/or "ဒေါင်းလုပ်" (download).
  DOWNLOAD_RECEIPT_BUTTON:
    '//*[(@text="Download Receipt" or @text="DOWNLOAD RECEIPT" ' +
    'or contains(@text,"ဒေါင်းလုပ်") or contains(@text,"ပြေစာ")) and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[contains(@text,"Download Receipt") or contains(@text,"DOWNLOAD RECEIPT") ' +
    'or contains(@text,"ဒေါင်းလုပ်") or contains(@text,"ပြေစာ")]] ' +
    '| //*[contains(@text,"Download") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"download_receipt") and @clickable="true"]',
  DOWNLOAD_OPTION:
    '//*[(@text="Download" or @text="DOWNLOAD") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"download") and @clickable="true" and not(contains(@resource-id,"receipt"))]',
  DOWNLOAD_SUCCESS_TOAST:
    '//*[contains(@text,"Downloaded") or contains(@text,"saved") or contains(@text,"Saved")]',
  SHARE_BUTTON:
    '//*[(@text="Share" or @text="SHARE" or @text="မျှဝေ") and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="Share" or @text="SHARE" or @text="မျှဝေ"]] ' +
    '| //*[contains(@resource-id,"share") and @clickable="true"] ' +
    '| //*[@content-desc="Share"]',
  SHARE_SHEET_MARKER:
    '//*[contains(@text,"Share via") or contains(@text,"Share with") or contains(@text,"Sharesheet")] ' +
    '| //android.widget.LinearLayout[contains(@resource-id,"chooser")] ' +
    '| //*[contains(@resource-id,"chooser_list")]',
} as const;
