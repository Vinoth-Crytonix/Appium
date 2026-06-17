# =====================================================================================
# Feature      : Device Validation
# Description  : Device-shell behaviour — orientation, screen lock, background/foreground.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@device
Feature: Device Validation
  Device-shell behaviour: orientation, screen lock, background/foreground.

  Scenario: Backgrounding and resuming keeps the user on the same screen
    Given the app is on the "Pay" screen
    When I background the app for 3 seconds
    And I bring the app to the foreground
    Then the app should be on the "Pay" screen
