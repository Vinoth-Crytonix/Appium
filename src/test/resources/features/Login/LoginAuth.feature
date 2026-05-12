Feature: Login — authorize a payment

  This feature exercises the login flow in isolation. It assumes a PayTo payment
  has been submitted first (the Background takes the same path so the login
  screen is visible when the When step runs).

  Background:
    Given I am on the home screen
    When I tap the Pay tab
    And I enter the configured account number
    And I enter a random amount with at most 3 digits
    And I enter remarks "Test"
    And I tap Submit

  Scenario: Authorize with literal password
    Given the login screen is shown
    When I log in with password "123456"
    Then the receipt is captured and I return to the home screen

  Scenario: Authorize with JSON test data
    Given the login screen is shown
    When I log in with the configured password
    Then the receipt is captured and I return to the home screen
