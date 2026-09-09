@dashboard
@US01
Feature: Customer Dashboard

  As a customer of ZincBank
  I want to see my personalized dashboard after logging in
  So that I can quickly access an overview of my accounts and recent activity

  Background:
    Given I am on the login page

  @US01-AC1
  Scenario: User is authenticated after logging in with valid credentials
    When I log in with valid credentials
    Then I should be logged in successfully

  @US01-AC2
  Scenario: User is redirected to the dashboard and sees the dashboard page
    When I log in with valid credentials
    Then I should be redirected to the dashboard
    And I should see the dashboard page

  @US01-AC3
  Scenario: Authenticated user remains authenticated when accessing the dashboard directly
    When I log in with valid credentials
    Then I should be redirected to the dashboard
    When I reload the page
    Then I should remain on the dashboard
    And I should be logged in successfully

  @US01-AC4
  Scenario: Unauthenticated user is redirected to the login page when accessing the dashboard
    When I visit the dashboard directly
    Then I should be redirected to the login page
    And I should not see any protected dashboard content

  @US01-AC5
  Scenario: Dashboard sidebar displays all required navigation elements
    When I log in with valid credentials
    Then the sidebar should display the navigation elements "Dashboard, Accounts, Move money, Transactions, Cards, Profile, Sign out"
    And each navigation element should display an icon

  @US01-AC6
  Scenario: User signs out and is redirected to the login page
    When I log in with valid credentials
    And I sign out
    Then I should be redirected to the login page
    And I should be logged out

  @US01-AC7
  Scenario: Signed out user cannot access the dashboard without authenticating again
    When I log in with valid credentials
    And I sign out
    Then I should be redirected to the login page
    When I visit the dashboard directly
    Then I should be redirected to the login page
    And I should not see any protected dashboard content
