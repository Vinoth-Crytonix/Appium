# =====================================================================================
# Feature      : Permission Validation
# Description  : Runtime permission grants and denials.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@permission
Feature: Permission Validation
  Runtime permission grants and denials.

  Scenario: Camera permission is requested before opening the QR scanner
    Given the camera permission has not been granted
    When I open the QR scanner
    Then a runtime permission prompt should be shown for "android.permission.CAMERA"
