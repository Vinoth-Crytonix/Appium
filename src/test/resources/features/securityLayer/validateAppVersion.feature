# =====================================================================================
# Feature      : Validate App Version
# Description  : Launch-stability soak for the security-layer suite — cold-start the app,
#                hold it open for a few seconds, then press Back until it closes. No UI
#                navigation beyond Back, and no money moves.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-08-06
# Last Updated : 2026-08-06
# =====================================================================================

@app-version @security-layer
Feature: App version — the build under test launches, holds and closes cleanly

  #
  # =================================================================================
  # Feature Description
  # =================================================================================
  #
  # The cycle is: start the app → hold 3–4 seconds → press Back until it closes.
  #
  # This feature validates:
  #
  # 1. The app cold-starts and survives the hold
  # 2. Back closes it — however many presses this build's exit flow needs
  #
  # Why it exists: repeated over --count cycles this is a launch soak — the
  # cheapest way to catch a build that crashes or ANRs on the Nth cold start.
  #
  # "start the app" is a COLD start (terminate, then activate). A plain activate
  # would only re-surface the process the previous cycle left behind, which
  # exercises nothing — the launch path is the thing under test.
  #
  # The Back press count is NOT fixed at two: the step presses and re-checks
  # until the app is off the foreground (up to 6). A build that adds or drops a
  # confirm-exit prompt still leaves a clean device for the next cycle.
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
  @success @app-version
  Scenario Outline: Launch, hold and close — cycle <SlNo> of <Total>

    #
    # -------------------------------------------------------------------------------
    # Action — cold-start the app and let it settle
    # -------------------------------------------------------------------------------
    #
    When I start the app
    And I hold the app open for <holdSeconds> seconds

    #
    # -------------------------------------------------------------------------------
    # Action / Validate — back out until the app is gone
    # -------------------------------------------------------------------------------
    #
    When I press the device back button until the app is closed
    Then the app should be closed


    #
    # -------------------------------------------------------------------------------
    # Launch Soak Test Data — ONE template row; the runner supplies the count
    # -------------------------------------------------------------------------------
    #
    # This table is deliberately a single row. The number of cycles is a RUNTIME
    # choice, not a file edit:
    #
    #     npm run test:appVersion -- --count 10
    #     npm run test:appVersion -- --count 100
    #
    # The runner expands this row to N rows into target/generated/ and runs that
    # copy, so all N cycles execute in ONE cucumber process and ONE Appium
    # session. SlNo is filled with the cycle number and Total with the requested
    # count, which is what the scenario name reads back.
    #
    # holdSeconds is how long the app is left open before Back — 4 by default;
    # every expanded cycle inherits whatever this row says.
    #
    Examples:
      | SlNo | Total | holdSeconds |
      | 1    | 1     | 4           |
