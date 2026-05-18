# =====================================================================================
# Feature
# =====================================================================================
# Feature Name   : Request Money — Submit Request
# Description    : Validate the Request Money flow of the Digital Kyats app. A money
#                  request is submitted end-to-end; the app prompts for authorization,
#                  the suite logs in, the success popup is confirmed, and the user
#                  returns to the home screen via the device back button.
#
# Application    : Digital Kyats (com.jas.digitalkyats)
# Module         : Payments
# Flow           : Home -> Request Money -> Enter Mobile Number -> Form -> (login)
#                  -> Success Popup -> Home
#
# Author         : Vignesh Raja
# Organization   : Holydaniels
# Created Date   : 2026-05-18
# Last Updated   : 2026-05-18
#
# Test Type      : Mobile UI Automation Test
# Framework      : Appium UiAutomator2 + Cucumber-JS + TypeScript
# Environment    : Android device / emulator (Appium server @ 127.0.0.1:4723)
#
# Tags
# ----
# @request-money : Opt-in profile for the Request Money flow.
#
# Arguments (Examples table)
# --------------------------
# SlNo           : Serial number of the data row
# Scenario Name  : Human-readable label for the data row
# mobileNumber   : Recipient mobile number the money is requested from
#
# Steps Overview
# --------------
#   1.  Tap the "Request Money" tile on home.
#   2.  Tap "Enter Mobile Number" to open the form.
#   3-9. Submit a Request Money (mobile, request-for, amount, remarks,
#        manual gallery image, Request Now radio, Submit, OK on popup).
#   10. Login when the login screen appears (re-uses the shared login procedure).
#   11. OK on the success popup.
#   12. Back to home.
#
# MANUAL STEP
# -----------
# The gallery image attachment is performed manually on the device — the Attach
# File widget does not respond to programmatic taps. The test pauses and resumes
# once the Request Money form is back on screen.
#
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
      | 1    | Submit request for a valid mobile number | 664433117    |
