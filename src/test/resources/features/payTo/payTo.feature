# =====================================================================================
# Feature      : PayTo — Submit Money Transfer
# Description  : Validate the PayTo money-transfer flow — submit a payment from the
#                Pay screen, auto-login when prompted, then verify the receipt and
#                return to home.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@payto
Feature: PayTo — submit a money transfer (auto-logs-in when prompted)

  
  # =================================================================================
  # Feature Description
  # =================================================================================
  
  # As a user I want to submit a payment from the PayTo screen so that, after the
  # app prompts me to authorize, I see the receipt and return home.
  
  # This feature validates:
  
  # 1. The PayTo form accepts account number, amount and remarks
  # 2. Submit triggers the authorization (login) prompt
  # 3. After login the confirmation Pay completes the payment
  # 4. The receipt is captured and the user lands back on the home screen
  
  # =================================================================================


  
  # =================================================================================
  # SUCCESS CASE
  # =================================================================================
  
  # Submit a payment end-to-end using the pipe-driven Examples table.
  
  @success
  Scenario Outline: Submit a payment end-to-end — <Scenario Name>

  # Precondition — on the home screen
   
    Given I am on the home screen

  # Action — open the Pay screen and fill the transfer form
    
    When I tap the Pay tab
    And I enter the account number "<account>"
    And I enter a random amount with at most <maxDigits> digits
    And I enter remarks "<remarks>"

    
  
  # Action — submit the transfer (triggers the login prompt)
    
    And I tap Submit

  # Validate — payment completes and the receipt is captured
    
    Then the payment is completed and the receipt is captured

  # PayTo Test Data
  
    Examples:
      | SlNo | Scenario Name                        | account      | maxDigits | remarks |
      | 1    | Submit payment with configured data  | 09987665544  | 3         | Test    |
