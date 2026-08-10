# =====================================================================================
# Feature      : Personal Profile — edit and submit
# Description  : Walk the profile edit path from Home: More → My Profile → Personal
#                Profile, enter edit mode from the footer Edit icon, scroll to the
#                email field, change it and submit. No money moves.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-08-06
# Last Updated : 2026-08-06
# =====================================================================================

@personal-profile @security-layer
Feature: Personal Profile — the account's email can be edited and submitted

  #
  # =================================================================================
  # Feature Description
  # =================================================================================
  #
  # The path is: Home → More → My Profile → Personal Profile → footer Edit icon
  # → scroll to Email → type a new address → Submit.
  #
  # This feature validates:
  #
  # 1. The profile screens are reachable from the More menu
  # 2. The footer Edit icon puts the form into edit mode
  # 3. The email field is reachable by scrolling, and accepts a new value
  # 4. Submit is accepted — a success message, or the form dropping back to
  #    read-only with the Edit icon on offer again
  #
  # The email in the Examples table carries a "{random}" token, which the step
  # replaces with a short random suffix at runtime. That is deliberate: this
  # build rejects a submit that does not actually change the address, so a
  # hard-coded value would pass once and then fail on every re-run.
  #
  # The scenario ends by backing out to Home, so it leaves the device in the
  # same state it started in and can be chained after any other feature.
  #
  # =================================================================================


  
  # =================================================================================
  # SUCCESS CASE
  # =================================================================================
  
  @success @personal-profile
  Scenario Outline: Edit the profile email and submit — "<Scenario Name>"

    
    # -------------------------------------------------------------------------------
    # Precondition — on the home screen
    # -------------------------------------------------------------------------------
    
    Given I am on the home screen

    
    # -------------------------------------------------------------------------------
    # Action — More → My Profile → Personal Profile
    # -------------------------------------------------------------------------------
    
    When I click the More menu
    Then the More screen should be displayed

    When I open My Profile
    Then the My Profile screen should be displayed

    When I open Personal Profile
    Then the Personal Profile screen should be displayed

    
    # -------------------------------------------------------------------------------
    # Action — enter edit mode from the footer
    # -------------------------------------------------------------------------------
    
    When I tap the Edit icon in the footer
    Then the profile fields should become editable

    
    # -------------------------------------------------------------------------------
    # Action — scroll to the email field and change it
    # -------------------------------------------------------------------------------
    
    When I scroll to the email field
    Then the email field should be displayed

    When I edit the email field with "<email>"
    And I submit the profile details
    Then the profile update should be accepted

    
    # -------------------------------------------------------------------------------
    # Reset — back out so the next scenario starts from Home
    # -------------------------------------------------------------------------------
    
    When I leave the profile screens
    Then User should be redirected to Home screen


    
    # -------------------------------------------------------------------------------
    # Personal Profile Test Data
    # -------------------------------------------------------------------------------

    #
    # "{random}" is substituted at runtime with a 5-character suffix, so every
    # cycle submits an address the account has not seen before. Drop the token
    # only if you want to assert the "unchanged email" rejection path instead.
    #
    # The runner's --count flag repeats this row:
    #
    #     npm run test:personalProfile -- --count 5
    
    Examples:
      | SlNo | Scenario Name                    | email                                   |
      | 1    | Update the email and submit      | qa.automation+{random}@test.com         |

