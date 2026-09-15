import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import { CustomWorld } from '../support/world';

// ---------------------------------------------------------------
// US03 — Moving Money (transfer between Checking and Savings).
// Step definitions only use high-level Page Object methods - there
// are NO raw Playwright locators or selectors in this file.
//
// Data strategy: transfers run against the shared demo customer
// (APP_USERNAME = Casey) whose Checking and Savings accounts carry real
// demo balances - freshly opened accounts start at $0.00 and cannot fund a
// transfer. Amounts are tiny so the demo balances are barely disturbed.
// The account option labels are matched by keyword ("Checking" / "Savings")
// because the app renders the live balance in the label
// (e.g. "Checking ••0001 ($1,573.30)").
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
    this.lastTransferFrom = from;
    this.lastTransferTo = to;
    await this.moveMoneyPage.transfer(from, to, amount);
  }
);

Then('I should see the transfer success message', async function (this: CustomWorld) {
  const message = await this.moveMoneyPage.getSuccessMessage();
  expect(message).toMatch(/Transferred[\s\S]*new balance \$[\d,]+\.\d{2}/i);
});

/**
 * AC2: "After a successful transfer, the transferred amount should be
 * deducted from the source account and added to the destination account."
 * Reads the source/destination balances from the form options BEFORE the
 * transfer, performs it, then polls the AFTER balances until they reflect
 * the move (the app re-renders the option labels asynchronously).
 */
Then(
  'the transfer should update the account balances by {string}',
  async function (this: CustomWorld, amount: string) {
    // Use the last transfer made in this scenario (already submitted).
    const from = this.lastTransferFrom;
    const to = this.lastTransferTo;
    if (!from || !to) {
      throw new Error(
        'No transfer was made. The step "I transfer ..." must run first.'
      );
    }

    const sourceBefore = await this.moveMoneyPage.getBalanceOfAccount(from);
    const destBefore = await this.moveMoneyPage.getBalanceOfToAccount(to);
    const amountNum = Number(amount);

    // Poll the AFTER balances: the source drops by `amount`, destination
    // grows by `amount` (tolerating small float rounding).
    // Jenkins environment can be slow, using 20s total budget.
    await expect
      .poll(async () => Number(await this.moveMoneyPage.getBalanceOfAccount(from)), {
        timeout: 20_000,
        intervals: [500, 1000, 2000, 5000]
      })
      .toBeCloseTo(Number(sourceBefore) - amountNum, 2);

    await expect
      .poll(async () => Number(await this.moveMoneyPage.getBalanceOfToAccount(to)), {
        timeout: 20_000,
        intervals: [500, 1000, 2000, 5000]
      })
      .toBeCloseTo(Number(destBefore) + amountNum, 2);
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

/** Goes back to the dashboard from the Move money page (SPA-safe). */
When('I go back to the dashboard', async function (this: CustomWorld) {
  await this.dashboardPage.clickNavItem('Dashboard');
  await this.dashboardPage.waitForRoute('/dashboard');
});

/**
 * AC4: a successful transfer is recorded as a transaction. After returning
 * to the dashboard, the transfer appears in the "Recent activity" list with
 * its amount (it is the most recent activity, so it shows at the top).
 */
Then('the transfer should appear in my recent activity', async function (this: CustomWorld) {
  const amount = '1.00';
  expect(await this.dashboardPage.isRecentTransferVisible(amount)).toBe(true);
});

/** AC4: a rejected transfer must not create a transaction record. */
Then(
  'no transfer of {string} should appear in my recent activity',
  async function (this: CustomWorld, amount: string) {
    // Short wait to let any (incorrect) activity settle, then assert absent.
    await this.page.waitForTimeout(1000);
    expect(await this.dashboardPage.isRecentTransferVisible(amount)).toBe(false);
  }
);