# =====================================================================================
# Feature      : API / Data Validation
# Description  : Backend contracts and data integrity checks invoked alongside UI flows.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@api
Feature: API / Data Validation
  Backend contracts and data integrity checks invoked alongside UI flows.

  Scenario: Transaction history endpoint returns the expected schema
    Given an authenticated session
    When I call GET "/api/transactions"
    Then the response status should be 200
    And the response body should match the "transactions" schema
