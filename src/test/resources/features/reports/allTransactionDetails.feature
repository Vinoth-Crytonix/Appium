# =====================================================================================
# Feature      : Reports — All Transaction Details
# Description  : Verify the Reports screen — transaction details, PDF view, search,
#                share, and statistics graph validations.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-06-17
# Last Updated : 2026-06-17
# =====================================================================================

@reports @all-transaction-details
Feature: Reports - All Transaction Details
  Verify Reports screen, transaction details, PDF view, search, share, and statistics graph validations.

  Background:
    Given If the application is not launched, user launches the application
    And If the application is already launched, user proceeds with next steps

  Scenario: Verify Reports screen, transaction details, PDF view, search, share, and statistics graph validations

    # Navigate to Reports
    When User clicks on "More" button from Home screen
    Then User should be redirected to More screen

    When User clicks on "Report" option
    Then User should be redirected to Report screen

    When User clicks on "All Transaction Details" from Report screen
    Then User should be redirected to Transaction Detail screen

    # Scroll Validation
    When User performs scrolling operation in Transaction Detail screen
    And User scrolls until reaching the top of the screen
    And User performs horizontal scroll from right to left until screen end

    # PDF Icon Validation
    When User clicks on PDF icon in the first transaction
    Then User should be redirected to PDF preview screen

    When User clicks on device back button
    Then User should be redirected back to Transaction Detail screen

    # Search Validation
    When User clicks on Search icon
    And User searches using random value
    And User searches using Transaction ID
    And User searches using Amount
    And User searches using Mobile Number
    Then Matching transaction results should be displayed accordingly

    # Share Validation
    When User clicks on Share icon
    And User selects PDF option
    Then PDF share preview should be displayed

    When User clicks on device back button
    Then User should be redirected back to Transaction Detail screen

    # Statistics Screen Validation
    When User clicks on the 3rd icon next to Share icon
    Then User should be redirected to Transaction Detail Statistics screen

    # Mobile Number Dropdown
    When User clicks on Mobile Number dropdown
    And User selects the first available mobile number
    Then Transaction statistics should be updated accordingly

    # Graph Validation - Bar Graph
    When User clicks on Kebab menu
    And User selects "Bar Graph"
    Then Bar graph should be displayed successfully

    # Graph Validation - Pie Graph
    When User clicks on Kebab menu again
    And User selects "Pie Graph"
    Then Pie graph should be displayed successfully

    # Graph Validation - Line Graph
    When User clicks on Kebab menu again
    And User selects "Line Graph"
    Then Line graph should be displayed successfully

    # Back Navigation
    When User waits for 2 to 3 seconds
    And User clicks on back button repeatedly
    Then User should be redirected back to More screen
