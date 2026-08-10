/** Login screen locators — credentials + Login button only. */
export const LOGIN_LOCATORS = {
  PASSWORD_FIELD: '//*[@resource-id="com.jas.digitalkyats:id/otp_edit_text_password"]',
  LOGIN_BUTTON:   '//*[@resource-id="com.jas.digitalkyats:id/otp_button_otp_1"]',

  // Same password field as a UiAutomator selector. An XPath probe walks the
  // whole tree — expensive when polled, and worst on the WebView-backed
  // screens — whereas a resourceId UiSelector is an indexed lookup. Use this
  // in poll loops; the XPath above stays the default for one-shot waits.
  PASSWORD_FIELD_UIA:
    'android=new UiSelector().resourceId("com.jas.digitalkyats:id/otp_edit_text_password")',
} as const;
