# =====================================================================================
# Feature      : Myanmar Pay — Transaction History
# Description  : Enter Transaction History from the Myanmar Pay scanner — paginate with
#                View More, sort and export, then drill into a transaction to verify
#                Invoice / Share / Home navigation.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-06-17
# Last Updated : 2026-06-17
# =====================================================================================

@myanmar-pay-history
Feature: Myanmar Pay - Transaction History
  Enter the Transaction History screen from the Myanmar Pay scanner, paginate
  with View More, exercise sort + export menu options, then drill into a
  transaction to verify Invoice / Share / Home navigation.

  Scenario: Browse, sort and export Transaction History
    Given the app is active and on the Home screen
    And User launches the application
    When User clicks on "Myanmar Pay" module from Home screen

    # History Screen Navigation
    And User clicks on History icon or button
    Then User should be redirected to Transaction History screen

    When User clicks on device back button
    Then User should be redirected back to Myanmar Pay Scanner screen

    # Scroll Up Footer Feature
    And User clicks on Scroll Up feature displayed in footer
    Then User should be redirected to Transaction History screen

    # View More Validation
    When User clicks on "View More" button repeatedly
    Then User should continue loading transaction records
    And User stops clicking when "View More" button is hidden

    # Sort By Recent Validation
    When User clicks on menu button in Transaction History title bar
    And User selects "Recent" sorting option
    Then User should verify the first transaction is the most recent based on current date

    # Sort By Date Validation
    When User clicks on menu button again
    And User clicks on "Sort By Date"
    Then User should verify transaction history records are sorted by date

    When User clicks on menu button again
    And User clicks on "Sort By Date" again
    Then User should verify the first transaction record appears with different date ordering

    # Sort By Amount Validation
    When User clicks on menu button again
    And User clicks on "Sort By Amount"
    Then User should verify transaction history records are sorted by amount

    When User clicks on menu button again
    And User clicks on "Sort By Amount" again
    Then User should verify the first transaction record appears with different amount ordering

    # Sort By Name Validation
    When User clicks on menu button again
    And User clicks on "Sort By Name"
    Then User should verify transaction history records are sorted alphabetically by name

    When User clicks on menu button again
    And User clicks on "Sort By Name" again
    Then User should verify the first transaction record appears with different name ordering

    # Export PDF Validation
    When User clicks on menu button again
    And User clicks on "Export to PDF"
    Then Share screen should be displayed
    When User clicks on device back button
    Then User should be redirected back to Transaction History screen

    # Transaction Details Flow
    When User clicks on any transaction from Transaction History screen
    Then User should be redirected to Transaction Detail screen

    # Invoice Validation
    When User clicks on "Invoice" button
    Then Invoice screen or preview should be displayed
    When User clicks on device back button
    Then User should be redirected back to Transaction Detail screen

    # Share Validation
    When User clicks on "Share" button
    Then Share screen should be displayed
    When User clicks on device back button
    Then User should be redirected back to Transaction Detail screen

    # Home Navigation
    When User clicks on "Home" button
    Then User should be redirected to Home screen
