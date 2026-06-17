/**
 * Reports locators - More tile, Report option, and the All Transaction
 * Details screen (with its PDF, Search, Share, Statistics and graph sub-flows).
 *
 * Only "More" is confirmed (resource-id + content-desc captured from Appium
 * Inspector). The rest mirror the rest of the suite's package convention
 * (com.jas.digitalkyats:id/...) and use Burmese text fallbacks where the AUT
 * label is localised. Verify and tighten each selector when you inspect the
 * live screens.
 */
import { HOME_TAB } from './common.locators';

export const REPORTS_LOCATORS = {
  HOME_TAB,

  // ---- More tile on Home screen (confirmed) -----------------------------
  // Bottom-nav "More" — resource-id is the unambiguous anchor.
  MORE_TILE:
    '//*[@resource-id="com.jas.digitalkyats:id/more"] ' +
    '| //android.widget.FrameLayout[@content-desc="More"]',
  MORE_TILE_UIA:
    'new UiSelector().resourceId("com.jas.digitalkyats:id/more")',

  // ---- More screen marker ----------------------------------------------
  MORE_SCREEN_HEADER:
    '//*[contains(@resource-id,"toolbar_title_text") and (@text="More" or @text="အသေးစိတ်")] ' +
    '| //*[contains(@resource-id,"more_title")] ' +
    '| //*[@text="Report" or @text="အစီရင်ခံစာ"]',

  // ---- "Report" row inside More ----------------------------------------
  REPORT_OPTION:
    '//*[@clickable="true" and .//*[@text="Report" or @text="Reports" or @text="အစီရင်ခံစာ"]] ' +
    '| //*[@text="Report" or @text="Reports" or @text="အစီရင်ခံစာ"]',

  REPORT_SCREEN_HEADER:
    '//*[contains(@resource-id,"toolbar_title_text") and (@text="Report" or @text="Reports" or @text="အစီရင်ခံစာ")] ' +
    '| //*[@text="All Transaction Details" or contains(@text,"အပြည့်အစုံ")]',

  // ---- "All Transaction Details" row -----------------------------------
  ALL_TXN_DETAILS_OPTION:
    '//*[@clickable="true" and .//*[contains(@text,"All Transaction") or contains(@text,"အပြည့်အစုံ")]] ' +
    '| //*[contains(@text,"All Transaction Details")]',

  TXN_DETAIL_SCREEN_HEADER:
    '//*[contains(@resource-id,"toolbar_title_text") and (contains(@text,"Transaction Detail") or contains(@text,"အပြည့်အစုံ"))] ' +
    '| //*[contains(@resource-id,"transaction_detail")]',

  // ---- Scrollable list inside Transaction Detail ------------------------
  TXN_DETAIL_LIST:
    '//*[contains(@resource-id,"transaction_detail_list") or contains(@resource-id,"recycler") or contains(@class,"RecyclerView")]',

  // ---- PDF icon on first transaction row --------------------------------
  // Per-row icons usually share a resource-id; we take the first occurrence.
  FIRST_PDF_ICON:
    '(//*[contains(@resource-id,"pdf") or contains(@content-desc,"PDF") or contains(@content-desc,"pdf")])[1]',

  PDF_PREVIEW_SCREEN:
    '//*[contains(@resource-id,"pdf_view") or contains(@resource-id,"pdf_preview")] ' +
    '| //*[contains(@class,"PDFView") or contains(@class,"pdf")] ' +
    '| //*[contains(@text,"PDF")]',

  // ---- Toolbar icons on Transaction Detail screen -----------------------
  SEARCH_ICON:
    '//*[@content-desc="Search" or @content-desc="search"] ' +
    '| //*[contains(@resource-id,"search")]',

  SEARCH_INPUT:
    '//*[contains(@resource-id,"search_src_text") or contains(@resource-id,"search_input")] ' +
    '| //android.widget.EditText',

  SHARE_ICON:
    '//*[@content-desc="Share" or @content-desc="share"] ' +
    '| //*[contains(@resource-id,"share")]',

  // Share sheet PDF option.
  SHARE_PDF_OPTION:
    '//*[@clickable="true" and .//*[@text="PDF" or contains(@text,"pdf")]] ' +
    '| //*[@text="PDF"]',

  PDF_SHARE_PREVIEW:
    '//*[contains(@resource-id,"share_preview") or contains(@resource-id,"pdf_share")] ' +
    '| //*[contains(@text,"PDF") and (@clickable="true" or @focusable="true")]',

  // 3rd icon after Share — typically the Statistics / Chart toggle. Placeholder.
  STATISTICS_ICON:
    '//*[@content-desc="Statistics" or @content-desc="Chart" or @content-desc="Graph"] ' +
    '| //*[contains(@resource-id,"statistic") or contains(@resource-id,"chart")]',

  TXN_DETAIL_STATISTICS_SCREEN:
    '//*[contains(@resource-id,"toolbar_title_text") and (contains(@text,"Statistic") or contains(@text,"စာရင်းအင်း"))] ' +
    '| //*[contains(@resource-id,"statistic")]',

  // ---- Statistics screen controls ---------------------------------------
  MOBILE_NUMBER_DROPDOWN:
    '//*[contains(@resource-id,"mobile_number") or contains(@resource-id,"phone_dropdown")] ' +
    '| //*[@clickable="true" and .//*[contains(@text,"Mobile") or contains(@text,"ဖုန်း")]]',

  FIRST_MOBILE_NUMBER_OPTION:
    '(//*[contains(@resource-id,"mobile_number_item") or contains(@resource-id,"phone_item") ' +
    'or @clickable="true" and contains(@resource-id,"text")])[1]',

  KEBAB_MENU:
    '//*[@content-desc="More options" or @content-desc="more options" or @content-desc="More"] ' +
    '| //*[contains(@resource-id,"action_menu_more") or contains(@resource-id,"overflow")]',

  // Graph selection in the Kebab menu — text-driven.
  graphOption(label: 'Bar Graph' | 'Pie Graph' | 'Line Graph'): string {
    return `//*[@text="${label}"] | //*[@clickable="true" and .//*[@text="${label}"]]`;
  },

  BAR_GRAPH_MARKER:
    '//*[contains(@resource-id,"bar_chart") or contains(@class,"BarChart")]',
  PIE_GRAPH_MARKER:
    '//*[contains(@resource-id,"pie_chart") or contains(@class,"PieChart")]',
  LINE_GRAPH_MARKER:
    '//*[contains(@resource-id,"line_chart") or contains(@class,"LineChart")]',
} as const;
