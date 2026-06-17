# =====================================================================================
# Feature      : Request Money — Submit Request
# Description  : Validate the Request Money flow — submit a request end-to-end, log in
#                when prompted, confirm the success popup, then return to home.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
# =====================================================================================

@request-money
Feature: Request Money — submit one request end-to-end

  #
  # =================================================================================
  # Feature Description
  # =================================================================================
  #
  # As a user I want to submit a Request Money request so that, after the app
  # prompts me to authorize, I see the success popup and return to the home
  # screen via the device back button.
  #
  # This feature validates:
  #
  # 1. The Request Money tile and Enter Mobile Number option open the form
  # 2. The form accepts mobile number, request-for, amount, remarks and image
  # 3. The login prompt is authorized via the shared login procedure
  # 4. The success popup is confirmed and the user returns home via Back
  #
  # =================================================================================


  #
  # =================================================================================
  # SUCCESS CASE
  # =================================================================================
  #
  # Submit a Request Money end-to-end for the mobile number in the pipe-driven
  # Examples table, including the manual gallery attachment.
  #
  @success @request-money
  Scenario Outline: Submit a Request Money end-to-end — <Scenario Name>

    #
    # -------------------------------------------------------------------------------
    # Precondition — on the home screen
    # -------------------------------------------------------------------------------
    #
    Given I am on the home screen

    #
    # -------------------------------------------------------------------------------
    # Action — open the Request Money form
    # -------------------------------------------------------------------------------
    #
    When I tap the Request Money tile
    And I tap the Enter Mobile Number option

    #
    # -------------------------------------------------------------------------------
    # Action — fill and submit the request (includes the manual gallery step)
    # -------------------------------------------------------------------------------
    #
    And I submit a Request Money for "<mobileNumber>" attaching a gallery image

    #
    # -------------------------------------------------------------------------------
    # Action — confirm the success popup
    # -------------------------------------------------------------------------------
    #
    And I confirm the success popup

    #
    # -------------------------------------------------------------------------------
    # Validate — back on the home screen
    # -------------------------------------------------------------------------------
    #
    Then I return to the home screen via the back button

    #
    # -------------------------------------------------------------------------------
    # Request Money Test Data
    # -------------------------------------------------------------------------------
    #
    Examples:
      | SlNo | Scenario Name                            | mobileNumber |
      | 1    | Submit request for a valid mobile number | 09664433118  |