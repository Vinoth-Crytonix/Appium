# =====================================================================================
# Feature      : Localization Validation
# Description  : String translations, RTL layout, and locale-specific formatting.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@localization
Feature: Localization Validation
  String translations, RTL layout, locale-specific formatting.

  Scenario: Burmese locale renders the home tab label
    Given the device locale is "my_MM"
    When the app is cold-launched
    Then the "Home" tab label should be in Burmese
