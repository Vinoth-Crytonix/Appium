# =====================================================================================
# Feature      : Business Profile — open the photo picker and submit
# Description  : Walk the profile edit path from Home: More → My Profile → Business
#                Profile, enter edit mode from the footer Edit icon, scroll to Add
#                Business Photo, open it, back out, then submit. No field is typed
#                and no money moves.
# Author       : Vinoth
# Company      : Holydaniels
# Created Date : 2026-08-06
# Last Updated : 2026-08-06
# =====================================================================================

@business-profile @security-layer
Feature: Business Profile — the photo control opens and the form submits

  #
  # =================================================================================
  # Feature Description
  # =================================================================================
  #
  # The path is: Home → More → My Profile → Business Profile → footer Edit icon
  # → Edit on the gate dialog → scroll to Add Business Photo → tap it → Back →
  # Submit → Submit on the confirmation → OK on the acknowledgement.
  #
  # This feature validates:
  #
  # 1. The Business Profile screen is reachable from My Profile
  # 2. The footer Edit icon, via its gate dialog, opens edit mode
  # 3. Add Business Photo is reachable by scrolling and opens its picker
  # 4. Backing out of the picker returns to the form, not somewhere else
  # 5. Submit is accepted through the confirm + acknowledge dialogs
  #
  # Unlike personalProfile.feature this types NOTHING. No photo is attached
  # either: the tap opens the picker and Back dismisses it. Attaching a real
  # image would depend on what happens to be in each handset's gallery, which
  # is exactly the kind of per-device state a repeatable soak must not rely on.
  #
  # Submitting is a THREE-tap chain on this build — Submit, then Submit on the
  # "are you sure" dialog, then OK on the acknowledgement — and the app drops
  # back to Home once acknowledged. All three taps are handled inside the
  # submit step; the feature does not spell them out.
  #
  # The steps from Home down to My Profile, and the whole submit chain, are the
  # SAME step definitions the Personal Profile feature uses. Only the Business
  # screens have their own steps.
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
  @success @business-profile
  Scenario Outline: Open the business photo picker and submit — cycle <SlNo> of <Total>

    #
    # -------------------------------------------------------------------------------
    # Precondition — on the home screen
    # -------------------------------------------------------------------------------
    #
    Given I am on the home screen

    #
    # -------------------------------------------------------------------------------
    # Action — More → My Profile → Business Profile
    # -------------------------------------------------------------------------------
    #
    When I click the More menu
    Then the More screen should be displayed

    When I open My Profile
    Then the My Profile screen should be displayed

    When I open Business Profile
    Then the Business Profile screen should be displayed

    #
    # -------------------------------------------------------------------------------
    # Action — enter edit mode from the footer (clears the gate dialog too)
    # -------------------------------------------------------------------------------
    #
    When I tap the Edit icon in the footer
    Then the profile fields should become editable

    #
    # -------------------------------------------------------------------------------
    # Action — open the business photo picker, then back out of it
    # -------------------------------------------------------------------------------
    #
    When I scroll to the Add Business Photo option
    And I tap Add Business Photo
    And I press the back button
    Then the Business Profile form should still be displayed

    #
    # -------------------------------------------------------------------------------
    # Action — submit (Submit → Submit on the dialog → OK)
    # -------------------------------------------------------------------------------
    #
    When I submit the profile details
    Then the profile update should be accepted

    #
    # -------------------------------------------------------------------------------
    # Reset — back out so the next cycle starts from Home
    # -------------------------------------------------------------------------------
    #
    When I leave the profile screens
    Then User should be redirected to Home screen


    #
    # -------------------------------------------------------------------------------
    # Business Profile Test Data — ONE template row; the runner supplies the count
    # -------------------------------------------------------------------------------
    #
    # This table is deliberately a single row. The number of cycles is a RUNTIME
    # choice, not a file edit:
    #
    #     npm run test:businessProfile -- --count 10
    #     npm run test:businessProfile -- --count 100
    #
    # The runner expands this row to N rows into target/generated/ and runs that
    # copy, so all N cycles execute in ONE cucumber process and ONE Appium
    # session. SlNo is filled with the cycle number and Total with the requested
    # count, which is what the scenario name reads back.
    #
    Examples:
      | SlNo | Total |
      | 1    | 1     |
