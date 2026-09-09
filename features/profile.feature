@profile
@US02
Feature: Customer Profile

  As a customer of ZincBank
  I want to view and manage my profile information and change my password
  So that I can keep my account information up to date and secure

  # ------------------------------------------------------------------
  # Test data strategy
  # ------------------------------------------------------------------
  # The Profile edit form is only rendered for customers who completed the
  # "Open an account" wizard (the legacy login-only account has no profile on
  # file). Scenarios that exercise the profile form or change the password
  # therefore provision a fresh throwaway customer through the bank's own
  # onboarding wizard (unique email per run) and sign in as that customer.
  # This keeps every scenario isolated, idempotent and safe for both local
  # runs and Jenkins - no shared account is ever mutated.
  # Scenarios that only inspect the Change password section or trigger
  # password-change rejections (which cannot alter anything) use the
  # APP_USERNAME / APP_PASSWORD account from the environment.
  # ------------------------------------------------------------------

  Background:
    Given I am on the login page

  # ------------------------------------------------------------------
  # US-AC1 — Profile Information Display
  # ------------------------------------------------------------------
  @US02-AC1 @regression
  Scenario: Profile page displays the customer's current information
    When I open a new ZincBank customer account
    And I sign in with the account I just opened
    And I open my Profile page
    Then the profile fields should display the personal information I registered
    And the email field should display the email address I registered

  # ------------------------------------------------------------------
  # US-AC2 — Profile Field Editability
  # ------------------------------------------------------------------
  @US02-AC2 @regression
  Scenario: Editable profile fields accept changes while the email stays read-only
    When I open a new ZincBank customer account
    And I sign in with the account I just opened
    And I open my Profile page
    When I type new values into the editable profile fields
    Then the profile fields should show the values I typed
    And the email field should be displayed as read-only

  # ------------------------------------------------------------------
  # US-AC3 — Save Profile Changes
  # ------------------------------------------------------------------
  @US02-AC3 @regression
  Scenario: Saved profile changes persist after the Profile page is reloaded
    When I open a new ZincBank customer account
    And I sign in with the account I just opened
    And I open my Profile page
    When I update my profile information
    And I save my profile changes
    Then I should see the profile message "Profile saved"
    When I reload the profile page
    Then my updated profile information should still be displayed

  # ------------------------------------------------------------------
  # US-AC4 — Change Password Section
  # ------------------------------------------------------------------
  @US02-AC4 @regression
  Scenario: Profile page provides the Change password section
    When I log in with valid credentials
    And I open my Profile page
    Then I should see the Change password section
    And I should see the current password field
    And I should see the new password field
    And I should see the "Change password" button
  # ------------------------------------------------------------------
  # US-AC5 — Password Field Security
  # ------------------------------------------------------------------
  @US02-AC5 @regression
  Scenario: Password fields mask the entered characters
    When I log in with valid credentials
    And I open my Profile page
    When I type "Sup3rSecret!" into the current password field
    And I type "An0therSecret!" into the new password field
    Then the current password field should mask the entered characters
    And the new password field should mask the entered characters

  # ------------------------------------------------------------------
  # US-AC6 — New Password Validation
  # ------------------------------------------------------------------
  @US02-AC6 @regression
  Scenario: New password shorter than 8 characters is rejected
    When I open a new ZincBank customer account
    And I sign in with the account I just opened
    And I open my Profile page
    When I try to change my password to "1234567"
    Then I should see the password message "New password must be at least 8 characters"
    And I should remain on the Profile page
    When I sign out
    And I sign in with the account I just opened
    Then I should be logged in successfully

  # ------------------------------------------------------------------
  # US-AC7 — Change Password
  # ------------------------------------------------------------------
  @US02-AC7 @regression
  Scenario: Customer changes the password with the correct current password
    When I open a new ZincBank customer account
    And I sign in with the account I just opened
    And I open my Profile page
    When I change my password to "ZincChange!2026"
    Then I should see the password message "Password changed"
    When I sign out
    And I sign in with the account I just opened using my new password
    Then I should be logged in successfully

  # ------------------------------------------------------------------
  # US-AC8 — Incorrect Current Password
  # ------------------------------------------------------------------
  @US02-AC8 @regression
  Scenario: Incorrect current password prevents the password change
    When I log in with valid credentials
    And I open my Profile page
    When I try to change my password to "ZincChange!9999" with the current password "WrongP4ss!"
    Then I should see the password message "Current password is incorrect"
    And I should remain on the Profile page

  # ------------------------------------------------------------------
  # US-AC9 — Successful Password Change
  # ------------------------------------------------------------------
  @US02-AC9 @regression
  Scenario: Successful password change displays the success message
    When I open a new ZincBank customer account
    And I sign in with the account I just opened
    And I open my Profile page
    When I change my password to "ZincChange!2027"
    Then I should see the password message "Password changed"
