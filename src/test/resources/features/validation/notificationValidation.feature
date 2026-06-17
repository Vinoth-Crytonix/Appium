# =====================================================================================
# Feature      : Notification Validation
# Description  : Push and in-app notification handling.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@notification
Feature: Notification Validation
  Push and in-app notifications.

  Scenario: Tapping a transaction push opens the receipt screen
    Given a transaction push notification has been received
    When I tap the notification
    Then the app should be on the "Receipt" screen
