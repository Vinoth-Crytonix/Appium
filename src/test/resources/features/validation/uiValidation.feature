# =====================================================================================
# Feature      : UI Validation
# Description  : Visual integrity of screens — layout, labels, icons, accessibility text.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@ui
Feature: UI Validation
  Visual integrity of screens: layout, labels, icons, accessibility text.

  Scenario: Home screen renders the primary tabs
    Given the app is on the home screen
    Then I should see the "Home" tab
   
