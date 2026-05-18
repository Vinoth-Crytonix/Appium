@request-money
Feature: Request Money — submit one request end-to-end

  # As a user I want to submit a Request Money request so that, after the app
  # prompts me to authorize, I see the success popup and return to the home
  # screen via the device back button.

  # Flow:
  #   1.  Tap the "Request Money" tile on home.
  #   2.  Tap "Enter Mobile Number" to open the form.
  #   3-9. Submit a Request Money (mobile, request-for, amount, remarks,
  #        manual gallery image, Request Now radio, Submit, OK on popup).
  #   10. Login when the login screen appears (re-uses Login.performLogin).
  #   11. OK on the success popup.
  #   12. Back to home.

  Scenario: Submit a Request Money end-to-end
    Given I am on the home screen
    When I tap the Request Money tile
    And I tap the Enter Mobile Number option
    And I submit a Request Money for "664433117" attaching a gallery image
    And I confirm the success popup
    Then I return to the home screen via the back button
