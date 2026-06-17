# =====================================================================================
# Feature      : Myanmar Pay Personal
# Description  : Subscriber QR scan and payment submission with manual QR upload, login
#                re-auth, and receipt actions (Invoice + Share).
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-06-17
# Last Updated : 2026-06-17
# =====================================================================================

@myanmar-pay-personal
Feature: Myanmar Pay Personal
  Subscriber QR scan, payment submission, login re-auth and receipt actions
  (Invoice + Share). The Upload-QR step blocks for the human to pick an image
  from the system gallery; a wrong selection retries once.

  Scenario: Pay via Myanmar Pay with manual QR upload, then exercise the receipt
    Given the app is active and on the Home screen
    And User is on the home screen for Myanmar Pay
    When User taps the Myanmar Pay module

    # Scanner screen - subscriber-only path
    Then If the scanner screen appears, the subscriber UI is validated
    When User toggles the torch on and off

    # Manual gallery pick with one retry on wrong QR
    And User uploads a QR and selects the image manually
    Then User should be redirected to the Myanmar Pay payment screen

    # Payment form
    When User enters a random amount with at most 3 digits
    And User enters remarks "Myanmar pay"
    And User taps Confirm Payment

    # Receipt + Invoice / Share
    Then The receipt screen is shown and captured
    And User stores the payment details in a file
    When User taps Invoice and presses back
    And User taps Share and presses back until the home screen is reached
    Then User should land on Home screen after final payment
