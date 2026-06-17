# =====================================================================================
# Feature      : Interruption Validation
# Description  : Calls, alarms and system dialogs interrupting an in-progress flow.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@interruption
Feature: Interruption Validation
  Calls, alarms and system dialogs interrupting an in-progress flow.

  Scenario: Incoming call during checkout preserves the form state
    Given I am on the "Pay" screen with an amount of "1000" entered
    When an incoming call is simulated and dismissed
    Then the amount field should still contain "1000"
