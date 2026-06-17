# =====================================================================================
# Feature      : Navigation Validation
# Description  : Back-stack, deep-link and tab-switch correctness.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@navigation
Feature: Navigation Validation
  Back-stack, deep-link and tab-switch correctness.

  Scenario: Back button returns to the previous screen
    Given the app is on the "Pay" screen
    When I tap the device back button
    Then the app should be on the home screen
