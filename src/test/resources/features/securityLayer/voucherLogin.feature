# =====================================================================================
# Feature      : Voucher Login Loop
# Description  : Exercise the app login repeatedly by re-entering the Voucher module.
#                The module demands re-authentication on EVERY open, so opening it,
#                logging in, and backing out is a self-resetting login cycle — no
#                payment is submitted and no money moves.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-08-05
# Last Updated : 2026-08-05
# =====================================================================================

@voucher-login @manual-login
Feature: Login — repeated authorisation via the Voucher module

  #
  # =================================================================================
  # Feature Description
  # =================================================================================
  #
  # This feature validates:
  #
  # 1. Tapping the Voucher tile on Home raises the login screen — every time
  # 2. The configured password authorises successfully on each attempt
  # 3. The Voucher module renders once authorised
  # 4. Backing out returns to Home, leaving the app ready for the next cycle
  #
  # Why the Voucher module: login.feature cannot loop on its own. The login screen
  # is never shown by simply (re)launching the app — an authenticated session
  # survives a cold start — and the only other trigger in the suite is a PayTo
  # submit, which completes a real transfer. Voucher prompts unconditionally and
  # costs nothing.
  #
  # The @manual-login tag switches OFF the global auto-login AfterStep hook for
  # this feature; otherwise the hook would dismiss the very prompt under test.
  #
  # The cycle count is NOT baked into this file. The Examples table holds a
  # single template row and the runner's --count flag decides how many times it
  # runs (see the note above the table).
  #
  # =================================================================================


  #
  # =================================================================================
  # SUCCESS CASE
  # =================================================================================
  #
  @success @voucher-login
  Scenario Outline: Authorise via the Voucher module — cycle <SlNo> of <Total>

    #
    # -------------------------------------------------------------------------------
    # Precondition — on the home screen
    # -------------------------------------------------------------------------------
    #
    Given I am on the home screen

    #
    # -------------------------------------------------------------------------------
    # Action — open Voucher, which forces re-authentication
    # -------------------------------------------------------------------------------
    #
    When I open the Voucher module
    Then the login screen should be displayed

    #
    # -------------------------------------------------------------------------------
    # Action — log in with the supplied password
    # -------------------------------------------------------------------------------
    #
    When I log in with password "<password>"
    Then the Voucher module should be displayed

    #
    # -------------------------------------------------------------------------------
    # Reset — leave the module so the next cycle starts from Home
    # -------------------------------------------------------------------------------
    #
    When I leave the Voucher module
    Then User should be redirected to Home screen


    #
    # -------------------------------------------------------------------------------
    # Login Loop Test Data — ONE template row; the runner supplies the count
    # -------------------------------------------------------------------------------
    #
    # This table is deliberately a single row. The number of login cycles is a
    # RUNTIME choice, not a file edit:
    #
    #     npm run test:voucher -- --count 10
    #     npm run test:voucher -- --count 100
    #
    # The runner expands this row to N rows into target/generated/ and runs that
    # copy, so all N cycles execute in ONE cucumber process and ONE Appium
    # session. SlNo is filled with the cycle number and Total with the requested
    # count, which is what the scenario name reads back.
    #
    Examples:
      | SlNo | Total | password |
      | 1    | 1     | 123456   |
