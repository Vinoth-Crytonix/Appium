@merchant-payment
Feature: Merchant Payment — recorded coordinate flow with login

  This flow is driven by raw coordinate taps captured from Appium Inspector
  (no resource-ids were available). The recorded taps are replayed in order;
  when the Submit tap is reached the app shows the login screen, at which
  point the shared login procedure (Login.performLogin) authorizes the
  payment, and the remaining taps complete the flow.

  NOTE: coordinate taps are device-resolution specific (captured on a
  720 x 1600 screen). They will need re-capturing if the device changes.

  Scenario: Complete a merchant payment end-to-end
    Given I am on the home screen
    When I run the merchant payment tap sequence
    Then the merchant payment is completed
