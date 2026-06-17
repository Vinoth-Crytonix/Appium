# =====================================================================================
# Feature      : Login Authentication
# Description  : Validate the Digital Kyats login screen in isolation — enter the
#                password and tap Login; no payment is processed.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-05-18
# Last Updated : 2026-06-17
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
