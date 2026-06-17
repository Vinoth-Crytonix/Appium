# =====================================================================================
# Feature      : Recent Transactions
# Description  : Verify Recent Transactions screens, Send Again across All / Debit /
#                Credit tabs, and scrolling operations.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-06-17
# Last Updated : 2026-06-17
# =====================================================================================

@recent-transactions
Feature: Recent Transactions
  Verify Recent Transactions screens, Send Again functionality, and scrolling operations.

  Scenario: Browse and Send Again across All / Debit / Credit tabs
    Given User launches the application
    When User clicks on "Recent Transactions" from Home screen

    # Conditional Login Flow
    Then If Login screen appears, user performs login with valid credentials

    # ALL Transactions Tab
    Then User should be redirected to Recent Transactions screen
    And User performs scroll operation in "All" transaction screen

    When If "Send Again" button is available in All transactions
    And User clicks on the first available "Send Again" button
    Then User should be redirected to Pay screen
    When User clicks on device back button
    Then User should be redirected back to Recent Transactions screen

    # Debit Transactions Tab
    When User clicks on "Debit" tab
    Then User performs scroll operation in "Debit" transaction screen

    When If "Send Again" button is available in Debit transactions
    And User clicks on the first available "Send Again" button
    Then User should be redirected to Pay screen
    When User clicks on device back button
    Then User should be redirected back to Recent Transactions screen

    # Credit Transactions Tab — last leg, scenario ends on Home
    When User clicks on "Credit" tab
    Then User performs scroll operation in "Credit" transaction screen
    When User clicks on device back button
    Then User should be redirected to Home screen
