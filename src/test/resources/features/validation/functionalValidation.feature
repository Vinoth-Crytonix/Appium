# =====================================================================================
# Feature      : Functional Validation
# Description  : End-to-end business behaviour assertions that complement the flow
#                features.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@functional
Feature: Functional Validation
  End-to-end business behaviour assertions that complement the flow features.

  Scenario: A flow leaves the app in a consistent state
    Given the app is on the home screen
    When a PayTo flow has just completed
    Then the app should be on the home screen
