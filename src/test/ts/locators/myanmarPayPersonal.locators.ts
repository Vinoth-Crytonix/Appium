import { HOME_TAB } from './common.locators';

/**
 * Myanmar Pay Personal flow locators.
 *
 * The scanner screen offers torch + upload-QR; the Upload QR path delegates
 * to the system gallery so the user picks the image manually. Selectors are
 * heuristic (text + resource-id contains) - swap in exact ids once confirmed
 * via Appium Inspector.
 */
export const MYANMAR_PAY_PERSONAL_LOCATORS = {
  HOME_TAB,

  // Home tile that opens Myanmar Pay. On this build the tile is icon-only
  // (no TextView label) — the "MyanmarPay" text is part of the icon image.
  // Identify it as the home grid tile with an ImageView but NO descendant
  // TextView containing text.
  MYANMAR_PAY_TILE:
    '//android.widget.RelativeLayout[@clickable="true" ' +
    'and .//*[@resource-id="com.jas.digitalkyats:id/normalCardView"] ' +
    'and not(.//android.widget.TextView[string-length(@text) > 0])] ' +
    '| //*[@clickable="true" and .//*[@text="MyanmarPay" or @text="Myanmar Pay" or @text="MYANMAR PAY" or contains(@text,"မြန်မာ")]] ' +
    '| //*[contains(@resource-id,"myanmar_pay") and @clickable="true"] ' +
    '| //*[contains(@content-desc,"Myanmar Pay") or contains(@content-desc,"MyanmarPay")]',

  // Scanner screen markers (visible only for subscribers). Confirmed
  // resource-ids from runtime dump on this build.
  SCANNER_HEADER:
    '//*[@resource-id="com.jas.digitalkyats:id/scantext"] ' +
    '| //*[contains(@text,"Scan Qr Code") or contains(@text,"Scan QR")]',
  SCANNER_VIEWFINDER:
    '//*[@resource-id="com.jas.digitalkyats:id/camera_main"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/frame"]',

  // Torch toggle — the clickable container is flash_layout; the icon swaps
  // states internally on each tap.
  TORCH_ICON:
    '//*[@resource-id="com.jas.digitalkyats:id/flash_layout"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/flash_img"]/parent::* ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/flash_text"]/parent::*',

  // Upload QR entry point — clickable container is gallery_layout.
  UPLOAD_QR_BUTTON:
    '//*[@resource-id="com.jas.digitalkyats:id/gallery_layout"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/upload_qr_img"]/parent::* ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/upload_qr_text"]/parent::*',

  // Popup shown when the chosen image is not a valid QR.
  WRONG_QR_POPUP:
    '//*[contains(@text,"Please scan correct QR") or contains(@text,"Invalid QR") ' +
    'or contains(@text,"correct QR") or contains(@text,"valid QR")]',
  WRONG_QR_OK_BUTTON:
    '//*[(@text="OK" or @text="Ok" or @text="ok") and @clickable="true"]',

  // Myanmar Pay payment screen (reached after a valid QR scan). Confirmed
  // resource-ids from runtime dump on this build.
  PAYMENT_SCREEN_HEADER:
    '//*[@resource-id="com.jas.digitalkyats:id/toolbar_title" and @text="MyanmarPay"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/amount_ed"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/toolbar_title"]',
  AMOUNT_FIELD:
    '//*[@resource-id="com.jas.digitalkyats:id/amount_ed"]',
  REMARKS_FIELD:
    '//*[@resource-id="com.jas.digitalkyats:id/remarks_ed"]',
  CONFIRM_PAYMENT_BUTTON:
    '//*[(@text="Confirm Payment" or @text="CONFIRM PAYMENT" or @text="Confirm" ' +
    'or contains(@text,"အတည်ပြု")) and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[contains(@text,"Confirm Payment") or contains(@text,"CONFIRM PAYMENT") ' +
    'or contains(@text,"အတည်ပြု")]] ' +
    '| //*[contains(@resource-id,"confirm") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"submit") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"pay_btn") and @clickable="true"]',

  // Receipt screen markers + buttons.
  // Receipt screen marker — English and Burmese forms. Burmese "လက်ခံပြေစာ"
  // = Receipt; "လုပ်ဆောင်ချက် ပြီးမြောက်" = Action Completed (success label).
  RECEIPT_MARKER:
    '//*[contains(@text,"Receipt") or contains(@text,"Successful") or contains(@text,"Success") ' +
    'or contains(@text,"လက်ခံပြေစာ") or contains(@text,"ပြေစာ") ' +
    'or contains(@text,"ပြီးမြောက်") or contains(@text,"အောင်မြင်") ' +
    'or contains(@resource-id,"receipt") or contains(@resource-id,"success")]',

  // An incoming "You received money" notification (and similar app alerts) can
  // pop OVER the receipt screen right after Confirm Payment, hiding the receipt
  // marker. Its OK / Close button is tapped during the receipt wait so the
  // receipt can surface. Text-based only, so it never grabs an icon back/exit.
  NOTIFICATION_DISMISS:
    '//*[@clickable="true" and (' +
    '@text="OK" or @text="Ok" or @text="ok" or @text="OKAY" or @text="Okay" or @text="okay" ' +
    'or @text="Close" or @text="CLOSE" or @text="close" ' +
    'or @text="ဟုတ်ကဲ့" or @text="အိုကေ" or @text="ပိတ်ရန်")]',
  INVOICE_BUTTON:
    '//*[(@text="Invoice" or @text="INVOICE" or @text="ပြေစာ") and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="Invoice" or @text="INVOICE" or @text="ပြေစာ"]] ' +
    '| //*[contains(@resource-id,"invoice") and @clickable="true"]',
  SHARE_BUTTON:
    '//*[(@text="Share" or @text="SHARE" or @text="မျှဝေပါ" or @text="မျှဝေ") and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="Share" or @text="SHARE" or @text="မျှဝေပါ" or @text="မျှဝေ"]] ' +
    '| //*[contains(@resource-id,"share") and @clickable="true"] ' +
    '| //*[@content-desc="Share"]',
} as const;
