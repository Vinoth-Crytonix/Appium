import { HOME_TAB } from './common.locators';

/**
 * RecentTransactions locators - the Recent Transactions screen with its three
 * tabs (All / Debit / Credit) and the per-row "Send Again" action.
 *
 * Resource-ids are placeholders mirroring the rest of the suite's package
 * (com.jas.digitalkyats:id/...). Swap the exact ids in once Appium Inspector
 * confirms them on the real build.
 */
export const RECENT_TXN_LOCATORS = {
  // Bottom Pay tab - marker for "back on home".
  HOME_TAB,

  // Entry point from the home screen. The label TextView is not clickable
  // itself — only its parent tile is, so we match a clickable element that
  // contains the text.
  // The label is "Recent\nTransactions" (with an embedded newline) on this
  // build — match on substring presence instead of exact text.
  // "နောက်ဆုံး" (most recent) is the Burmese discriminator that's unique to
  // the Recent Transactions tile — the Home screen also has a "လုပ်ဆောင်မှု"
  // tile for Frequent Activities that we must NOT match.
  RECENT_TXN_ENTRY:
    '//*[@clickable="true" and .//*[contains(@text,"Recent") and contains(@text,"Transactions")]] ' +
    '| //*[@clickable="true" and .//*[contains(@text,"နောက်ဆုံး")]] ' +
    '| //*[@clickable="true" and .//*[@text="မှတ်တမ်း"]] ' +
    '| //*[contains(@resource-id,"recent_transaction") and @clickable="true"] ' +
    '| //*[contains(@content-desc,"Recent Transaction")]',

  // Recent Transactions screen marker (header / title text).
  // The Debit/Credit tab pair is unique to the Recent Transactions screen.
  SCREEN_HEADER:
    '//*[@clickable="true" and .//*[@text="Debit"]] ' +
    '| //*[@clickable="true" and .//*[@text="Credit"]] ' +
    '| //*[contains(@resource-id,"recent_transaction_title")]',

  // Tab strip - one per category.
  TAB_ALL:
    '//*[(@text="All" or @text="အားလုံး") and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="All" or @text="အားလုံး" or contains(@text,"အားလုံး")]]',
  TAB_DEBIT:
    '//*[(@text="Debit" or @text="ထုတ်ယူ") and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="Debit" or @text="ထုတ်ယူ"]]',
  TAB_CREDIT:
    '//*[(@text="Credit" or @text="အပ်ငွေ") and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="Credit" or @text="အပ်ငွေ"]]',

  // List container - used as the scroll target.
  TRANSACTION_LIST:
    '//*[contains(@resource-id,"transaction_list") or contains(@resource-id,"recycler")]',

  // Any visible "Send Again" button in the current tab. Burmese label on this
  // build is "ထပ်မံပေးပို့ရန်" — match it on the TextView and ascend to a
  // clickable ancestor (the label itself usually isn't clickable).
  // Target the Send Again pill specifically. The row card is also clickable,
  // so a broad "clickable ancestor of text" match would tap the wrong thing.
  // Try (in order): exact text + clickable, the text itself, then resource-id.
  SEND_AGAIN_BUTTON:
    '(//*[(@text="Send Again" or @text="SEND AGAIN" or @text="ထပ်မံပေးပို့ရန်") and @clickable="true"] ' +
    '| //*[@text="ထပ်မံပေးပို့ရန်"]/parent::*[@clickable="true"] ' +
    '| //*[@text="ထပ်မံပေးပို့ရန်"] ' +
    '| //*[contains(@resource-id,"send_again") and @clickable="true"])[1]',

  // Pay screen marker reached after tapping Send Again.
  // Match ONLY the Pay form's toolbar title (resource-id), not the Home
  // screen's "ငွေပေး" tile label which uses a generic resource-id.
  PAY_SCREEN_HEADER:
    '//*[@resource-id="com.jas.digitalkyats:id/toolbar_title_text" and (@text="Pay" or @text="PAY" or @text="ငွေပေး")] ' +
    '| //*[contains(@resource-id,"pay_screen_header")]',
} as const;
