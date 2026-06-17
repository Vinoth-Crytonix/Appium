# =====================================================================================
# Feature      : Merchant Payment — End-to-End Flow
# Description  : Validate the merchant-payment journey — select category and merchant,
#                fill the form, attach an image, submit, authorise via login,
#                re-login after the session-expiry popup, pay, then return to home.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@merchant-payment
Feature: Merchant Payment — end-to-end flow with session-expiry re-login

  #
  # =================================================================================
  # SUCCESS CASE
  # =================================================================================
  #
  @success @merchant-payment
  Scenario Outline: Complete a merchant payment end-to-end — <Scenario Name>

    Given User launches the application
    When User clicks on "Merchant Payment" from Home screen

    # Merchant Category Screen
    Then User should be redirected to Merchant Category screen
    When User clicks on search icon in Merchant Category screen
    And User enters random invalid input in Merchant Category search field
    Then User should verify no records are displayed
    When User clears the Merchant Category search field
    And User enters <merchantCategory> in Merchant Category search field
    Then User should verify matching category results are displayed
    When User selects a Merchant Category
    Then User should be redirected to Merchant List screen

    When User verifies whether records are available in Merchant List screen
    Then If "No Record Found" message is displayed
    When User clicks on device back button
    Then User should be redirected back to Merchant Category screen

    When User clicks on search icon in Merchant Category screen
    And User clears the Merchant Category search field
    And User enters <alternateMerchantCategory> in Merchant Category search field
    Then User should verify matching category results are displayed
    When User selects another Merchant Category
    Then User should be redirected to Merchant List screen

    # Merchant List Search Flow
    When User clicks on search icon in Merchant List screen
    And User enters random invalid input in Merchant List search field
    Then User should verify no records are displayed in Merchant List
    When User clears the Merchant List search field
    And User enters <merchantList> in Merchant List search field
    Then User should verify matching merchant results are displayed
    When User selects a Merchant from the Merchant List

    # Payment Details Screen — Amount field (enter, clear, re-enter)
    And User enters random amount with maximum <maxDigits> digits in Amount field
    And User clicks on close button in Amount field
    And User enters random amount with maximum <maxDigits> digits in Amount field

    # Reference + Remarks
    And User enters random input with maximum 10 digits in Reference field
    And User enters "<remarks>" in Remarks field

    # Attachment — Gallery (manual)
    When User clicks on "Attach File"
    And User selects "Gallery" option
    Then User manually selects an image from gallery
    And User returns back to Pay screen

    # Submit Payment
    When User clicks on "Submit" button
    Then User should be redirected to Login screen
    When User performs login with valid credentials
    Then User should be redirected to Confirmation screen

    # Session Expiry Handling (handled inline by the Pay click — see below)
    When User waits until session expired popup appears
    And User clicks on "OK" button in session expired popup

    #Second Login Attempt after Session Expiry
    Then User should be redirected back to Pay screen
    When User clicks on "Submit" button
    When User performs login with valid credentials
    Then User should be redirected back to Confirmation screen
   
    # Successful Payment
    When User clicks on "Pay" button
    Then Payment should be completed successfully
    And User should be redirected to Receipt screen

    # Receipt Screen
    When User clicks on "Share" button
    And User clicks on device back button
    And User clicks on "Back To Home" button
    Then User should be redirected to Home screen

    Examples:
      | SlNo | merchantCategory  | alternateMerchantCategory | merchantList | maxDigits | remarks          |
      | 1    |  Holland          | Android Development       | KGF          | 3         | Merchant Payment |
