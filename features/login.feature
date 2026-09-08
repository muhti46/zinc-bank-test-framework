@login
@US00
Feature: Customer Login

  As a customer of ZincBank
  I want to log in to my account using my email and password
  So that I can securely access my account

  Background:
    Given I am on the login page

  @US00-AC1
  Scenario: Login form displays all required elements
    Then I should see the ZincBank branding
    And I should see the email field
    And I should see the password field
    And I should see the sign in button
    And I should see the "Open an account" link

  @US00-AC2
  Scenario: User successfully logs in with valid credentials
    When I log in with valid credentials
    Then I should be logged in successfully

  @US00-AC3
  Scenario: System prevents login with invalid credentials
    When I log in with invalid credentials
    Then I should see an error message
    And I should remain on the login page

  @US00-AC4
  Scenario: System shows a validation message when required fields are empty
    When I click the sign in button with empty fields
    Then I should see the message "Enter your email and password."
    And I should remain on the login page

  @US00-AC5
  Scenario: System validates the email format
    When I enter an invalid email format
    Then I should see the message "Enter your email and password."
    And I should remain on the login page

  @US00-AC6
  Scenario: Password field masks the entered characters
    When I enter the password "Sup3rSecret!"
    Then the password field should mask the characters

