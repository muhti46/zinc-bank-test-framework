@move-money
@US03
Feature: Moving Money

  As a customer of ZincBank
  I want to transfer money between my Checking Account and Savings Account
  So that I can manage my money and save funds easily

  Background:
    Given I am on the login page

  # ------------------------------------------------------------------
  # US-AC1 — Money Transfer form
  # ------------------------------------------------------------------
  @US03-AC1 @regression
  Scenario: Transfer form offers source and destination account selection
    When I log in with valid credentials
    And I open the Move money page
    Then I should see the transfer form
    And I should see a source account selector
    And I should see a destination account selector
    And I should see the transfer amount field
    And I should see the transfer button

  # ------------------------------------------------------------------
  # US-AC2 — Successful transfer (both directions)
  # ------------------------------------------------------------------
  @US03-AC2 @regression
  Scenario: Transferring from Checking to Savings updates balances
    When I log in with valid credentials
    And I open the Move money page
    When I transfer "15.00" from "Checking" to "Savings"
    Then I should see the transfer success message
    And the success message should state the updated source balance

  @US03-AC2 @regression
  Scenario: Transferring from Savings to Checking updates balances
    When I log in with valid credentials
    And I open the Move money page
    When I transfer "10.00" from "Savings" to "Checking"
    Then I should see the transfer success message
    And the success message should state the updated source balance

  # ------------------------------------------------------------------
  # US-AC3 — Insufficient funds
  # ------------------------------------------------------------------
  @US03-AC3 @regression
  Scenario: Transfer exceeding the available balance is rejected
    When I log in with valid credentials
    And I open the Move money page
    When I try to transfer "5000.00" from "Checking" to "Savings"
    Then I should see the "INSUFFICIENT_FUNDS" error message
    And I should remain on the Move money page

  # ------------------------------------------------------------------
  # US-AC4 — Transaction record
  # ------------------------------------------------------------------
  @US03-AC4 @regression
  Scenario: A successful transfer is recorded as a transaction
    When I log in with valid credentials
    And I open the Move money page
    When I transfer "5.00" from "Checking" to "Savings"
    Then I should see the transfer success message
    When I open my transactions page
    Then a transaction for "5.00" should be listed with the source and destination accounts

  @US03-AC4 @regression
  Scenario: A rejected transfer does not create a transaction record
    When I log in with valid credentials
    And I open the Move money page
    When I try to transfer "5000.00" from "Checking" to "Savings"
    Then I should see the "INSUFFICIENT_FUNDS" error message
    When I open my transactions page
    Then no transaction for "5000.00" should be listed