# =====================================================================================
# Feature      : PayTo — Submit Money Transfer
# Description  : Validate the PayTo money-transfer flow — fill the Pay form, submit,
#                authorise via login, handle the session-expiry round-trip on the
#                merchant confirmation, pay, then return to home.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-23
# =====================================================================================

@payto
Feature: PayTo — submit a money transfer end-to-end

  #
  # =================================================================================
  # SUCCESS CASE
  # =================================================================================
  #
  @success
  Scenario Outline: Submit a payment end-to-end — "<Scenario Name>"

    # Precondition — on the home screen
    Given I am on the home screen

    # Open the Pay screen and fill the transfer form
    When I tap the Pay tab
    And I enter the account number "<account>"
    And I enter a random amount with at most <maxDigits> digits
    And I enter remarks "<remarks>"

    # Submit — triggers the authorisation (login) prompt
    When User clicks on "Submit" button
    Then User should be redirected to Login screen
    When User performs login with valid credentials
    Then User should be redirected to Confirmation screen

    
    # Pay — complete the payment and land on the receipt. A merchant receiver
    # (09664433118) requires a MANUAL Pay tap; other receivers tap automatically.
    When User taps the Pay button to complete the payment
    Then Payment should be completed successfully
    And User should be redirected to Receipt screen

    # Receipt — return to home
    When User clicks on "Back To Home" button
    Then User should be redirected to Home screen

    # PayTo Test Data — merchant receiver (drives the confirmation + session round-trip)
    Examples:
      | SlNo | Scenario Name                        | account      | maxDigits | remarks |
      | 1    | Submit payment with configured data  | 09664433118  | 3         | Test    |

    # Second-device row — same flow, same data. Runs ONLY when 2 devices are
    # connected: the runner adds `not @second-device` when fewer than 2 devices
    # are available, so a single-device run executes just the first example.
    @second-device
    Examples:
      | SlNo | Scenario Name                        | account      | maxDigits | remarks |
      | 2    | Submit payment with configured data  | 09987665544  | 3         | Test    |
