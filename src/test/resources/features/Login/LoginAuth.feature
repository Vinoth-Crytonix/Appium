@login-only
Feature: Login — credentials only

  Tests the login screen in isolation. No payment is processed here: this
  feature only enters the password and taps the Login button.

  Precondition: the device must already be on the login screen when this
  feature is run (e.g. left there by a prior PayTo flow that stopped at
  authorization, or navigated to manually). If not, the first step fails
  with a clear "expected the login screen" assertion.

  Scenario: Authorize on the login screen with the configured password
    Given the login screen is shown
    When I log in with the configured password
    Then the login screen is dismissed
