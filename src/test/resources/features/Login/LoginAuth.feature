# =====================================================================================
# Feature
# =====================================================================================
# Feature Name   : Login Authentication
# Description    : Validate the login screen of the Digital Kyats app in isolation.
#                  This feature only enters the password and taps the Login button;
#                  no payment is processed here.
#
# Application    : Digital Kyats (com.jas.digitalkyats)
# Module         : Authentication
# Flow           : Login screen — credentials only
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
# @login-only    : Opt-in profile; the scenario expects the device to ALREADY be
#                  on the login screen when the run starts.
#
# Arguments (Examples table)
# --------------------------
# SlNo           : Serial number of the data row
# Scenario Name  : Human-readable label for the data row
# password       : Password entered on the login screen
#
# Preconditions
# -------------
# The device must already be on the login screen when this feature is run (e.g.
# left there by a prior PayTo flow that stopped at authorization, or navigated to
# manually). If not, the first step fails with a clear "expected the login
# screen" assertion.
#
# =====================================================================================

@login-only
Feature: Login — credentials only

  #
  # =================================================================================
  # Feature Description
  # =================================================================================
  #
  # This feature validates:
  #
  # 1. The login screen is correctly detected when shown
  # 2. The password from the Examples table authorizes successfully
  # 3. The login screen is dismissed after a successful login
  #
  # =================================================================================


  #
  # =================================================================================
  # SUCCESS CASE
  # =================================================================================
  #
  # Enter the password from the pipe-driven Examples table and confirm the login
  # screen is dismissed.
  #
  @success @login-only
  Scenario Outline: Authorize on the login screen — <Scenario Name>

    #
    # -------------------------------------------------------------------------------
    # Precondition — login screen is displayed
    # -------------------------------------------------------------------------------
    #
    Given the login screen is shown

    #
    # -------------------------------------------------------------------------------
    # Action — log in with the supplied password
    # -------------------------------------------------------------------------------
    #
    When I log in with password "<password>"

    #
    # -------------------------------------------------------------------------------
    # Validate — login screen is dismissed
    # -------------------------------------------------------------------------------
    #
    Then the login screen is dismissed

    #
    # -------------------------------------------------------------------------------
    # Login Test Data
    # -------------------------------------------------------------------------------
    #
    Examples:
      | SlNo | Scenario Name                       | password |
      | 1    | Authorize with configured password  | 123456   |
