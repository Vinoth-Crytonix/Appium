# =====================================================================================
# Feature      : Electricity Bill Payment
# Description  : Pay an electricity bill via duplicate-meter and non-duplicate (My
#                Meter / Other Meter) paths — form entry, branch detection, payment
#                summary, receipt, Download/Share, then back to home.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-06-17
# Last Updated : 2026-06-17
# =====================================================================================

@electricity
Feature: Electricity Bill Payment
  Pay an electricity bill via duplicate-meter and non-duplicate (My Meter /
  Other Meter) paths. The scenario covers form entry, branch detection,
  payment summary + receipt, Download and Share, then back-to-home navigation.

  Background:
    Given If the application is not active, user launches the application
    And User should be on Home screen
    And If Login screen appears at any stage, user performs login dynamically with valid credentials

  Scenario Outline: Electricity payment — <Scenario Name>

       # Navigate to Electricity Module
    When User scrolls in Home screen until "Electricity" module is visible
    And User clicks on "Electricity" module
    Then User should be redirected to Electricity Bill Payment screen

    # Meter Number Entry
    When User enters "<meterNumber>" in Meter Number field

    # Popup Handling After Meter Number Entry
    Then If any popup appears after entering meter number
    When User dismisses the popup
    And User proceeds with next meter number flow accordingly

    # Duplicate Meter Flow
    Then If entered meter number is duplicate
    And Computer Code field should be displayed
    When User enters "<computerCode>" in Computer Code field
    And User enters "<ledgerNumber>" in Ledger Number field

    # Non-Duplicate Meter Flow
    Then If entered meter number is not duplicate
    And Meter Type dropdown should be displayed

    When User selects "<meterType>" from Meter Type dropdown

    # My Meter Flow
    Then If Meter Type is selected as "My Meter"
    And Contact Number field should not be mandatory

    # Other Meter Flow
    Then If Meter Type is selected as "Other Meter"
    When User enters "<contactNumber>" in Contact Number field

    # Remarks and Favourite
    And User enters "Test EB" in Remarks field
    And User checks "Add to Favourites" checkbox

    # Get Bill and Payment
    When User clicks on "Get Bill" button
    Then User should be redirected to Payment Summary screen

    When User clicks on "Proceed to Pay" button
    And If Login screen appears, user performs login dynamically
    Then User should be redirected to Payment Receipt screen

    # Receipt Actions — single Download click is enough on this build.
    When User clicks on "Download Receipt" button
    Then Receipt should be downloaded successfully

    When User clicks on "Share" button
    Then Share screen should be displayed

    When User clicks on device back button after receipt
    And User clicks on back button repeatedly until Home screen is reached
    Then User should land on Home screen after final payment

    Examples:
      | SlNo | Scenario Name                  | meterNumber       | computerCode                | ledgerNumber   | meterType   | contactNumber |
      | 1    | Not Updated Number             | 1610654           |                             | 1/2/2018       | My Meter    |               |
      | 2    | Duplicate Meter Payment Flow   | 1611335606        | 802-040-020-002-00000069    | 02/02/2002     | My Meter    |               |
      | 3    | Other Meter Payment Flow       | G-92426           |                             |                | Other Meter | 987665544     |
 
