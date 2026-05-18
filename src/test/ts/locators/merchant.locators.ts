import { HOME_TAB } from './common.locators';

/** Merchant Payment flow locators. */
export const MERCHANT_LOCATORS = {
  HOME_TAB,

  MERCHANT_LIST_MARKER:
    '//*[contains(@text,"Merchant List") or contains(@text,"ကုန်သည်စာရင်း")]',

  // Confirmation-screen Pay button (English / Burmese, by text or resource-id).
  PAY_BUTTON:
    '//*[(@text="Pay" or @text="PAY" or @text="ငွေပေး" or @text="ပေးချေမည်") and @clickable="true"] ' +
    '| //android.widget.Button[@text="Pay" or @text="PAY" or @text="ငွေပေး"] ' +
    '| //*[contains(@resource-id,"pay") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"confirm") and @clickable="true"]',

  // Merchant payment form fields — best-effort locators (hint / resource-id).
  AMOUNT_FIELD:
    '//android.widget.EditText[contains(@hint,"Amount") or contains(@hint,"amount")] ' +
    '| //*[contains(@resource-id,"amount") and contains(@class,"EditText")] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/new_send_money_amount"]',
  REFERENCE_FIELD:
    '//android.widget.EditText[contains(@hint,"Reference") or contains(@hint,"reference") ' +
    'or contains(@hint,"Ref")] ' +
    '| //*[contains(@resource-id,"reference") and contains(@class,"EditText")] ' +
    '| //*[contains(@resource-id,"refId") and contains(@class,"EditText")] ' +
    '| //*[contains(@resource-id,"ref_id") and contains(@class,"EditText")]',
  REMARKS_FIELD:
    '//android.widget.EditText[contains(@hint,"Remark") or contains(@hint,"remark") ' +
    'or contains(@hint,"Note")] ' +
    '| //*[contains(@resource-id,"remark") and contains(@class,"EditText")] ' +
    '| //*[contains(@resource-id,"comment") and contains(@class,"EditText")]',
} as const;

/** A single coordinate tap captured from Appium Inspector. */
export type Tap = { x: number; y: number };

/** One screen of the recorded merchant-payment coordinate flow. */
export type MerchantScreen = {
  name: string;
  /** XPath that uniquely identifies the screen; waited for before tap 1. */
  marker?: string;
  /** Fill Amount / Reference ID / Remarks while on this screen. */
  fillForm?: boolean;
  /** Click the Pay button (by locator) instead of replaying coordinate taps. */
  clickPay?: boolean;
  taps: Tap[];
};

/**
 * The merchant-payment flow — taps grouped BY SCREEN (from Appium Inspector).
 *
 * Treating the flow as data keeps {@link MerchantPaymentPage} closed for
 * modification (Open/Closed): re-capturing the journey or inserting a screen
 * is an edit here, not a change to the replay engine.
 *
 * ⚠ Coordinates are specific to a 720 x 1600 device. Re-capture if the
 *   device / resolution changes.
 */
export const MERCHANT_FLOW: MerchantScreen[] = [
  {
    name: 'Home Screen',
    marker: MERCHANT_LOCATORS.HOME_TAB,
    taps: [{ x: 585, y: 654 }],                               // tap 1
  },
  {
    name: 'Merchant Category Screen',
    taps: [{ x: 417, y: 1162 }],                              // tap 2
  },
  {
    name: 'Merchant List Screen',
    marker: MERCHANT_LOCATORS.MERCHANT_LIST_MARKER,
    taps: [{ x: 479, y: 225 }],                               // tap 3
  },
  {
    name: 'Pay Screen',
    fillForm: true,
    taps: [
      { x: 270, y: 734 },   // tap 4
      { x: 220, y: 786 },   // tap 5
      { x: 365, y: 1147 },  // tap 6
      { x: 590, y: 1485 },  // tap 7
      { x: 635, y: 751 },   // tap 8
      { x: 453, y: 903 },   // tap 9
      { x: 523, y: 788 },   // tap 10
      { x: 386, y: 1317 },  // tap 11
      { x: 609, y: 1343 },  // tap 12
      { x: 523, y: 905 },   // tap 13
      { x: 408, y: 1499 },  // tap 14
    ],
  },
  {
    name: 'Confirmation Screen',
    // Click the Pay button by locator instead of replaying coordinate taps.
    clickPay: true,
    taps: [],
  },
  {
    name: 'Receipt Screen',
    taps: [
      { x: 568, y: 1213 },  // tap 24 — Share
      { x: 611, y: 110 },   // tap 25 — back
      { x: 132, y: 1214 },  // tap 26 — Back to Home
    ],
  },
];
