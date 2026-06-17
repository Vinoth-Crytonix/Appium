# =====================================================================================
# Feature      : Security Validation
# Description  : UI-observable security behaviour — masked fields, session timeout, no
#                PII in logs.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@security
Feature: Security Validation
  UI-observable security behaviour: masked fields, session timeout, no PII in logs.

  Scenario: Password field masks input
    Given the app is on the login screen
    When I enter "secret123" into the password field
    Then the password field should not reveal "secret123"
