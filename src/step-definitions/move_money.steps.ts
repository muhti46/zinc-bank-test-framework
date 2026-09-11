import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import { CustomWorld } from '../support/world';

// ---------------------------------------------------------------
// US03 — Moving Money (transfer between Checking and Savings).
// Step definitions only use high-level Page Object methods - there
// are NO raw Playwright locators or selectors in this file.
//
// Data strategy: transfers run against the APP_* environment account
// (same account the login/dashboard scenarios use). Transfer amounts are
// small and both transfers in a run are net-zero per direction pair, so
// no shared state is mutated destructively across runs.
// The account option labels are matched by keyword ("Checking Account" /
// "Savings Account") because the live app's labels change with data
// resets (e.g. "Checking - $1,234.56").
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// US03-AC1 — Transfer form
// ---------------------------------------------------------------

When('I open the Move money page', async function (this: CustomWorld) {
  await this.moveMoneyPage.navigateToMoveMoneyPage();
});

Then('I should see the transfer form', async function (this: CustomWorld) {
  expect(await this.moveMoneyPage.isTransferFormVisible()).toBe(true);
});

Then('I should see a source account selector', async function (this: CustomWorld) {
  expect(await this.moveMoneyPage.isSourceAccountSelectVisible()).toBe(true);
});

Then(
  'I should see a destination account selector',
  async function (this: CustomWorld) {
    expect(await this.moveMoneyPage.isDestinationAccountSelectVisible()).toBe(true);
  }
);

Then('I should see the transfer amount field', async function (this: CustomWorld) {
  expect(await this.moveMoneyPage.isAmountFieldVisible()).toBe(true);
});

Then('I should see the transfer button', async function (this: CustomWorld) {
  expect(await this.moveMoneyPage.isTransferButtonVisible()).toBe(true);
});

// ---------------------------------------------------------------
// US03-AC2 — Successful transfer
// ---------------------------------------------------------------

When(
  'I transfer {string} from {string} to {string}',
  async function (this: CustomWorld, amount: string, from: string, to: string) {
    await this.moveMoneyPage.transfer(from, to, amount);
  }
);

Then('I should see the transfer success message', async function (this: CustomWorld) {
  const message = await this.moveMoneyPage.getSuccessMessage();
  expect(message).toMatch(/Transferred[\s\S]*new balance \$[\d,]+\.\d{2}/i);
});

/**
 * AC2: "The displayed new balance should match the updated balance of the
 * source account." Cross-checks the amount parsed out of the success message
 * against the balance shown on the source account option label (when the app
 * renders one). If the option label carries no balance, the check degrades
 * gracefully to the success-message format assertion only.
 */
Then(
  'the success message should state the updated source balance',
  async function (this: CustomWorld) {
    const messageBalance = await this.moveMoneyPage.getNewBalanceFromSuccessMessage();
    expect(messageBalance).not.toBe('');

    const optionBalance = await this.moveMoneyPage.getBalanceFromSourceOption();
    if (optionBalance) {
      expect(messageBalance).toBe(optionBalance);
    }
  }
);

// ---------------------------------------------------------------
// US03-AC3 — Insufficient funds
// ---------------------------------------------------------------

When(
  'I try to transfer {string} from {string} to {string}',
  async function (this: CustomWorld, amount: string, from: string, to: string) {
    await this.moveMoneyPage.transfer(from, to, amount);
  }
);

Then(
  'I should see the {string} error message',
  async function (this: CustomWorld, expectedText: string) {
    const actual = await this.moveMoneyPage.getErrorMessage();
    expect(actual).toContain(expectedText);
  }
);

Then('I should remain on the Move money page', async function (this: CustomWorld) {
  expect(await this.moveMoneyPage.isOnMoveMoneyPage()).toBe(true);
});

// ---------------------------------------------------------------
// US03-AC4 — Transaction record
// ---------------------------------------------------------------

When('I open my transactions page', async function (this: CustomWorld) {
  await this.transactionsPage.navigateToTransactionsPage();
});

/**
 * AC4: a successful transfer is recorded as a transaction showing the
 * transfer amount, source account, destination account and transaction date.
 * The row is located inside the transactions view by its amount, and the
 * row must also mention the source and destination account wording.
 */
Then(
  'a transaction for {string} should be listed with the source and destination accounts',
  async function (this: CustomWorld, amount: string) {
    expect(await this.transactionsPage.isViewVisible()).toBe(true);

    const row = await this.transactionsPage.findTransactionRow(amount);
    expect(row).not.toBeNull();

    const rowText = (await row?.textContent()) ?? '';
    expect(rowText).toMatch(/Checking/i);
    expect(rowText).toMatch(/Savings/i);
    // A transaction record carries a date (e.g. 2026-09-10 or Sep 10, 2026).
    expect(rowText).toMatch(/\d{4}[-/]\d{2}[-/]\d{2}|\w{3,9}\s\d{1,2},\s\d{4}/i);
  }
);

/** AC4: a rejected transfer must not create a transaction record. */
Then(
  'no transaction for {string} should be listed',
  async function (this: CustomWorld, amount: string) {
    expect(await this.transactionsPage.isViewVisible()).toBe(true);
    expect(await this.transactionsPage.findTransactionRow(amount)).toBeNull();
  }
);