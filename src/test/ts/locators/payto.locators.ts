import { HOME_TAB } from './common.locators';

/** PayTo flow locators. */
export const PAYTO_LOCATORS = {
  // The "Pay" tile on the Home body (English "Pay" or Burmese "ငွေပေး").
  // Bottom Home tab now uses id/home and is NOT what we want to tap — the
  // user wants the Pay TILE that opens the PayTo form.
  PAY_TAB:
    '//*[@clickable="true" and .//*[@text="Pay" or @text="ငွေပေး"]] ' +
    '| //*[@content-desc="Pay" and @clickable="true"] ' +
    '| //*[contains(@resource-id,"pay") and @clickable="true" and not(contains(@resource-id,"home"))]',

  ACCOUNT_FIELD: '//*[@resource-id="com.jas.digitalkyats:id/account_number_edittext"]',
  AMOUNT_FIELD:  '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_amount"]',
  REMARKS_FIELD: '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_comment"]',
  SUBMIT_BUTTON: '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_submit_button"]',

  // Confirmation screen Pay button (English or Burmese). NOT gated on
  // @enabled="true": a merchant receiver's Pay button doesn't report that
  // attribute, so requiring it strands the flow on the confirm screen. The
  // settle pause in completePayment covers the brief greyed window instead.
  PAY_CONFIRM:
    // The confirmation "Pay" action button. The merchant-receiver variant has
    // resource-id .../mconformation_submit_button (note: "conformation", not
    // "confirmation") which the text/"confirm" fallbacks below do NOT match, so
    // it is listed explicitly first.
    '//*[@resource-id="com.jas.digitalkyats:id/mconformation_submit_button"] ' +
    '| //*[contains(@resource-id,"conformation") and @clickable="true"] ' +
    '| //*[(@text="Pay" or @text="PAY" or @text="ငွေပေး" or @text="ပေးချေမည်") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Pay" or @text="PAY" or @text="ငွေပေး"] ' +
    '| //*[contains(@resource-id,"pay") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"confirm") and @clickable="true"]',

  // Merchant-receiver confirmation Pay button (exact id). NOTE: the personal
  // confirmation uses this SAME id, so it can't distinguish receiver types.
  MERCHANT_PAY_BUTTON:
    '//android.widget.Button[@resource-id="com.jas.digitalkyats:id/mconformation_submit_button"]',

  // A confirmation that shows the "My Number / Other Number" radio selector
  // requires a MANUAL Pay tap by the user; a personal confirmation has no such
  // selector and is paid automatically.
  MANUAL_PAY_SELECTOR:
    '//*[contains(@text,"My Number")] | //*[contains(@text,"Other Number")]',

  // Receipt / success screen marker (English or Burmese).
  RECEIPT_MARKER:
    '//*[contains(@text,"Receipt") or contains(@text,"Successful") ' +
    'or contains(@text,"Success") or contains(@text,"ပြေစာ")]',

  // Home button on receipt / success screen.
  HOME_BUTTON:
    '//*[(@text="Home" or @text="HOME" or @text="မူလ") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Home" or @text="မူလ"] ' +
    '| //*[@content-desc="Home" or @content-desc="မူလ"] ' +
    '| //*[contains(@resource-id,"home") and @clickable="true"]',
} as const;
