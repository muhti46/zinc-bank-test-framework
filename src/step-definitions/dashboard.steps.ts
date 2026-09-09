import { Then, When } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import { CustomWorld } from '../support/world';

// ---------------------------------------------------------------
// US001 — Customer Dashboard.
// Step definitions only use high-level Page Object methods.
// There are NO raw Playwright locators or selectors in this file.
// Credentials come from the .env file - never hardcode them here.
// ---------------------------------------------------------------

// ---------------------------------------------------------------
When('I navigate back to the dashboard', async function (this: CustomWorld) {
  await this.dashboardPage.clickNavItem('Dashboard');
  await this.page.waitForTimeout(500);
});

When('I reload the page', async function (this: CustomWorld) {
  await this.page.reload({ waitUntil: 'domcontentloaded' });
});

When('I visit the dashboard directly', async function (this: CustomWorld) {
  await this.dashboardPage.visitRoute('/dashboard');
});

Then('I should be redirected to the dashboard', async function (this: CustomWorld) {
  await this.dashboardPage.waitForRoute('/dashboard');
  expect(await this.dashboardPage.isOnPage('/dashboard')).toBe(true);
});

Then('I should see the dashboard page', async function (this: CustomWorld) {
  await this.dashboardPage.waitForRoute('/dashboard');
  expect(await this.dashboardPage.isWelcomeVisible()).toBe(true);
  expect(await this.dashboardPage.isBalanceOverviewVisible()).toBe(true);
});

Then('I should remain on the dashboard', async function (this: CustomWorld) {
  await this.dashboardPage.waitForRoute('/dashboard');
  expect(await this.dashboardPage.isOnPage('/dashboard')).toBe(true);
  expect(await this.dashboardPage.isOnLoginPage()).toBe(false);
});

Then('I should be redirected to the login page', async function (this: CustomWorld) {
  await this.dashboardPage.waitForRoute('/login');
  expect(await this.dashboardPage.isOnLoginPage()).toBe(true);
});

Then('I should not see any protected dashboard content', async function (this: CustomWorld) {
  expect(await this.dashboardPage.isProtectedContentVisible()).toBe(false);
  // The login form is shown instead of the protected content.
  expect(await this.loginPage.isEmailFieldVisible()).toBe(true);
});

// ---------------------------------------------------------------
// US01-AC5 — Sidebar navigation elements (labels, icons, routes)
// ---------------------------------------------------------------

Then(
  'the sidebar should display the navigation elements {string}',
  async function (this: CustomWorld, labels: string) {
    const items = labels.split(',').map((label) => label.trim());
    for (const label of items) {
      expect(await this.dashboardPage.isNavItemVisible(label)).toBe(true);
    }
  }
);

Then(
  'each navigation element should display an icon',
  async function (this: CustomWorld) {
    const items = [
      'Dashboard',
      'Accounts',
      'Move money',
      'Transactions',
      'Cards',
      'Profile',
      'Sign out'
    ];
    for (const label of items) {
      expect(await this.dashboardPage.navItemHasIcon(label), `${label} should show an icon`).toBe(
        true
      );
    }
  }
);
// ---------------------------------------------------------------
// US01-AC6/AC7 — Sign out
// ---------------------------------------------------------------

When('I sign out', async function (this: CustomWorld) {
  await this.dashboardPage.signOut();
});

Then('I should be logged out', async function (this: CustomWorld) {
  expect(await this.dashboardPage.isLoggedOut()).toBe(true);
});
