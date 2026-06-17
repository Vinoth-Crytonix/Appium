# =====================================================================================
# Feature      : Performance Validation
# Description  : Cold start, screen-transition timing, and memory thresholds.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@performance
Feature: Performance Validation
  Cold start, screen-transition timing, memory thresholds.

  Scenario: Cold start completes under the threshold
    Given the app is cold-launched
    Then the home screen should be visible within 5000 ms
