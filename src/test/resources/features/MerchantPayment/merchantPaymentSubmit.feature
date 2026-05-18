# =====================================================================================
# Feature
# =====================================================================================
# Feature Name   : Merchant Payment — Recorded Coordinate Flow
# Description    : Validate the merchant-payment journey of the Digital Kyats app.
#                  The flow is driven by raw coordinate taps captured from Appium
#                  Inspector (no resource-ids were available). The recorded taps are
#                  replayed in order; when the Submit tap is reached the app shows
#                  the login screen, the shared login procedure authorizes the
#                  payment, and the remaining taps complete the flow.
#
# Application    : Digital Kyats (com.jas.digitalkyats)
# Module         : Payments
# Flow           : Home -> Merchant Category -> Merchant List -> Pay -> (login)
#                  -> Confirmation -> Receipt
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
# @merchant-payment : Opt-in profile; this is a long recorded coordinate flow and
#                     is excluded from the default run.
#
# Arguments (Examples table)
# --------------------------
# SlNo           : Serial number of the data row
# Scenario Name  : Human-readable label for the data row
#
# NOTE: this flow takes no runtime input values — the journey is a fixed sequence
#       of recorded coordinate taps and the form values (amount, reference id,
#       remarks) are generated in code. The Examples table below is therefore a
#       documentation-only row, kept for format consistency with the other
#       feature files.
#
# Preconditions
# -------------
# The app is launched and the device is on the home screen (handled by the
# BeforeAll / Before hooks).
#
# WARNING
# -------
# Coordinate taps are device-resolution specific (captured on a 720 x 1600
# screen). They will need re-capturing if the device / resolution changes.
#
# =====================================================================================

@merchant-payment
Feature: Merchant Payment — recorded coordinate flow with login

  #
  # =================================================================================
  # Feature Description
  # =================================================================================
  #
  # This feature validates:
  #
  # 1. The recorded coordinate taps navigate Home -> Merchant -> Pay
  # 2. The merchant payment form is filled on the Pay screen
  # 3. The login prompt after Submit is authorized via the shared login procedure
  # 4. The confirmation and receipt screens complete the merchant payment
  #
  # =================================================================================


  #
  # =================================================================================
  # SUCCESS CASE
  # =================================================================================
  #
  # Replay the recorded tap sequence end-to-end and confirm the merchant payment
  # completes.
  #
  @success @merchant-payment
  Scenario Outline: Complete a merchant payment end-to-end — <Scenario Name>

    #
    # -------------------------------------------------------------------------------
    # Precondition — on the home screen
    # -------------------------------------------------------------------------------
    #
    Given I am on the home screen

    #
    # -------------------------------------------------------------------------------
    # Action — replay the recorded merchant payment tap sequence
    # -------------------------------------------------------------------------------
    #
    When I run the merchant payment tap sequence

    #
    # -------------------------------------------------------------------------------
    # Validate — merchant payment is completed
    # -------------------------------------------------------------------------------
    #
    Then the merchant payment is completed

    #
    # -------------------------------------------------------------------------------
    # Merchant Payment Test Data (documentation-only — no runtime inputs)
    # -------------------------------------------------------------------------------
    #
    Examples:
      | SlNo | Scenario Name                       |
      | 1    | Complete a merchant payment journey |
