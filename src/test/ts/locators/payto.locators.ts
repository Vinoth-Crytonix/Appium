import { HOME_TAB } from './common.locators';

/** PayTo flow locators. */
export const PAYTO_LOCATORS = {
  // Bottom Pay tab (English or Burmese locale).
  PAY_TAB:       HOME_TAB,

  ACCOUNT_FIELD: '//*[@resource-id="com.jas.digitalkyats:id/account_number_edittext"]',
  AMOUNT_FIELD:  '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_amount"]',
  REMARKS_FIELD: '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_comment"]',
  SUBMIT_BUTTON: '//*[@resource-id="com.jas.digitalkyats:id/new_send_money_submit_button"]',

  // Confirmation screen Pay button (English or Burmese).
  PAY_CONFIRM:
    '//*[(@text="Pay" or @text="PAY" or @text="ငွေပေး") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Pay" or @text="ငွေပေး"] ' +
    '| //*[contains(@resource-id,"pay") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"confirm") and @clickable="true"]',

  // Home button on receipt / success screen.
  HOME_BUTTON:
    '//*[(@text="Home" or @text="HOME" or @text="မူလ") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Home" or @text="မူလ"] ' +
    '| //*[@content-desc="Home" or @content-desc="မူလ"] ' +
    '| //*[contains(@resource-id,"home") and @clickable="true"]',
} as const;
