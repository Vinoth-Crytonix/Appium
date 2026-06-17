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

  // Confirmation screen Pay button (English or Burmese). Requires @enabled="true":
  // the button is briefly disabled (greyed) while the confirm screen settles, and
  // tapping it then is a silent no-op that strands the flow on the confirm screen.
  PAY_CONFIRM:
    '//*[(@text="Pay" or @text="PAY" or @text="ငွေပေး") and @clickable="true" and @enabled="true"] ' +
    '| //android.widget.Button[(@text="Pay" or @text="ငွေပေး") and @enabled="true"] ' +
    '| //*[contains(@resource-id,"pay") and @clickable="true" and @enabled="true"] ' +
    '| //*[contains(@resource-id,"confirm") and @clickable="true" and @enabled="true"]',

  // Home button on receipt / success screen.
  HOME_BUTTON:
    '//*[(@text="Home" or @text="HOME" or @text="မူလ") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Home" or @text="မူလ"] ' +
    '| //*[@content-desc="Home" or @content-desc="မူလ"] ' +
    '| //*[contains(@resource-id,"home") and @clickable="true"]',
} as const;
