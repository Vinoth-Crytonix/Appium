import { HOME_TAB } from './common.locators';

/**
 * Myanmar Pay - Transaction History locators.
 *
 * Reached from the Myanmar Pay scanner screen via the History icon, or via
 * the Scroll-Up footer affordance. The screen has a paginated list (View More),
 * a title-bar menu with sort/export options, and a per-row tap that opens
 * the Transaction Detail screen.
 *
 * Selectors are heuristic (text + resource-id contains) - swap in exact ids
 * via Appium Inspector when confirmed.
 */
export const MYANMAR_PAY_HISTORY_LOCATORS = {
  HOME_TAB,

  // Entry from the Myanmar Pay scanner screen — confirmed resource-id from
  // runtime dump.
  HISTORY_ICON:
    '//*[@resource-id="com.jas.digitalkyats:id/history_img_layout"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/history_img"]/parent::* ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/history_text"]/parent::*',

  // Footer "Last Transaction" panel on the scanner — drag/tap expands into
  // Transaction History. resource-id confirmed from runtime dump.
  SCROLL_UP_FOOTER:
    '//*[@resource-id="com.jas.digitalkyats:id/lin_historymodel"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/last_trans_text"]/ancestor::*[@clickable="true"][1] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/drag_icon"]/ancestor::*[@clickable="true"][1]',

  // Transaction History screen marker — confirmed resource-id from runtime dump.
  HISTORY_HEADER:
    '//*[@resource-id="com.jas.digitalkyats:id/toolbar_title" and @text="Transaction History"] ' +
    '| //*[@resource-id="com.jas.digitalkyats:id/recy_mmqr_history"]',

  // List rows — each row has a rel_name container; using that as the row anchor.
  TRANSACTION_ROW:
    '//*[@resource-id="com.jas.digitalkyats:id/rel_name"]',
  FIRST_TRANSACTION_ROW:
    '(//*[@resource-id="com.jas.digitalkyats:id/rel_name"])[1]',

  // Pagination — confirmed resource-id from runtime dump.
  VIEW_MORE_BUTTON:
    '//*[@resource-id="com.jas.digitalkyats:id/view_more_button"] ' +
    '| //*[@text="View More" and @clickable="true"]',

  // Title-bar menu — exact locator confirmed via Appium Inspector.
  TITLE_BAR_MENU:
    '//android.widget.ImageView[@resource-id="com.jas.digitalkyats:id/menu"]',
  /** UiAutomator strategy variant — routes the click via the UIA framework. */
  TITLE_BAR_MENU_UIA:
    'new UiSelector().resourceId("com.jas.digitalkyats:id/menu")',

  // Sort menu items — the side panel exposes resource-ids per item.
  // Confirmed via Appium Inspector. Resource-id strategy is used in the
  // page (not xpath) so the click routes through UIA's perform-click.
  SORT_RECENT_ID:    'com.jas.digitalkyats:id/recent',
  SORT_BY_DATE_ID:   'com.jas.digitalkyats:id/date',
  SORT_BY_AMOUNT_ID: 'com.jas.digitalkyats:id/amount',
  SORT_BY_NAME_ID:   'com.jas.digitalkyats:id/name',
  EXPORT_TO_PDF_ID:  'com.jas.digitalkyats:id/pdf',
  // XPath fallbacks (text-based, in case the resource-ids differ).
  SORT_RECENT:
    '//*[@resource-id="com.jas.digitalkyats:id/recent"] ' +
    '| //*[@text="Recent" or @text="Most Recent"]',
  SORT_BY_DATE:
    '//*[@resource-id="com.jas.digitalkyats:id/date"] ' +
    '| //*[@text="Sort By Date" or @text="Sort by Date"]',
  SORT_BY_AMOUNT:
    '//*[@resource-id="com.jas.digitalkyats:id/amount"] ' +
    '| //*[@text="Sort By Amount" or @text="Sort by Amount"]',
  SORT_BY_NAME:
    '//*[@resource-id="com.jas.digitalkyats:id/name"] ' +
    '| //*[@text="Sort By Name" or @text="Sort by Name"]',
  EXPORT_TO_PDF:
    '//*[@resource-id="com.jas.digitalkyats:id/pdf"] ' +
    '| //*[@text="Export to PDF" or @text="Export PDF"]',

  // Share + Invoice + Detail screens.
  SHARE_SCREEN_MARKER:
    '//*[contains(@text,"Share via") or contains(@text,"Share with") or contains(@text,"Sharesheet")] ' +
    '| //android.widget.LinearLayout[contains(@resource-id,"chooser")] ' +
    '| //*[contains(@resource-id,"chooser_list")]',
  INVOICE_SCREEN_MARKER:
    '//*[contains(@text,"Transaction Details Receipt") or contains(@text,"Details Receipt") ' +
    'or contains(@text,"Invoice") ' +
    'or contains(@text,"လုပ်ဆောင်မှု ပြေစာ") or contains(@text,"ပြေစာ")]',
  // English ("Transaction Detail(s)") or Burmese ("လုပ်ဆောင်မှု မှတ်တမ်း"
  // / "မှတ်တမ်း အသေးစိတ်"). Also accept the receipt-style success marker
  // ("ပြီးမြောက်" = completed) as proof we're on the detail screen.
  DETAIL_HEADER:
    '//*[contains(@text,"Transaction Detail") or contains(@text,"Transaction Details") ' +
    'or contains(@text,"လုပ်ဆောင်မှု မှတ်တမ်း") or contains(@text,"မှတ်တမ်း") ' +
    'or contains(@text,"ပြီးမြောက်")]',

  INVOICE_BUTTON:
    '//*[(@text="Invoice" or @text="INVOICE") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"invoice") and @clickable="true"]',
  SHARE_BUTTON:
    '//*[(@text="Share" or @text="SHARE") and @clickable="true"] ' +
    '| //*[contains(@resource-id,"share") and @clickable="true"] ' +
    '| //*[@content-desc="Share"]',
  HOME_BUTTON:
    '//*[(@text="Home" or @text="HOME" or @text="မူလ") and @clickable="true"] ' +
    '| //*[@clickable="true" and .//*[@text="Home" or @text="HOME" or @text="မူလ"]] ' +
    '| //*[contains(@resource-id,"home") and @clickable="true"]',
} as const;
