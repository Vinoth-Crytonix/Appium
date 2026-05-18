Feature: PayTo — submit a money transfer (auto-logs-in when prompted)

  # As a user I want to submit a payment from the PayTo screen so that, after
  # the app prompts me to authorize, I see the receipt and return home.

  Scenario: Submit a payment end-to-end using JSON test data
    Given I am on the home screen
    When I tap the Pay tab
    And I enter the configured account number
    And I enter a random amount with at most 3 digits
    And I enter remarks "Test"
    And I tap Submit
    Then the payment is completed and the receipt is captured
