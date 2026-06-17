# =====================================================================================
# Feature      : Network Validation
# Description  : Offline behaviour, slow networks, and retries.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@network
Feature: Network Validation
  Offline behaviour, slow networks, retries.

  Scenario: Offline mode surfaces a friendly error
    Given the device is offline
    When I tap "Refresh"
    Then I should see "No internet connection"
