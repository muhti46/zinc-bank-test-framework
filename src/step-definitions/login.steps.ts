import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import { CustomWorld } from '../support/world';

// ---------------------------------------------------------------
// The step definitions only use high-level Page Object methods.
// There are NO raw Playwright locators or selectors in this file.
// Credentials come from the .env file - never hardcode them here.
// ---------------------------------------------------------------

Given('I am on the login page', async function (this: CustomWorld) {
  await this.loginPage.navigateToLoginPage();
});

// ---------------------------------------------------------------
// US00-AC1 — Login form displays all required elements
// ---------------------------------------------------------------

Then('I should see the ZincBank branding', async function (this: CustomWorld) {
  expect(await this.loginPage.isBrandingVisible()).toBe(true);
});

Then('I should see the email field', async function (this: CustomWorld) {
  expect(await this.loginPage.isEmailFieldVisible()).toBe(true);
});

Then('I should see the password field', async function (this: CustomWorld) {
  expect(await this.loginPage.isPasswordFieldVisible()).toBe(true);
});

Then('I should see the sign in button', async function (this: CustomWorld) {
  expect(await this.loginPage.isSignInButtonVisible()).toBe(true);
});

Then('I should see the "Open an account" link', async function (this: CustomWorld) {
  expect(await this.loginPage.isApplyLinkVisible()).toBe(true);
});

// ---------------------------------------------------------------
// US00-AC2 — Valid login
// ---------------------------------------------------------------

When('I log in with valid credentials', async function (this: CustomWorld) {
  const username = this.env('APP_USERNAME');
  const password = this.env('APP_PASSWORD');
  await this.loginPage.login(username, password);
});

Then('I should be logged in successfully', async function (this: CustomWorld) {
  const isLoggedIn = await this.loginPage.isLoginSuccessful();
  expect(isLoggedIn).toBe(true);
});

// ---------------------------------------------------------------
// US00-AC3 — Invalid credentials
// ---------------------------------------------------------------

When('I log in with invalid credentials', async function (this: CustomWorld) {
  const username = this.env('APP_INVALID_USERNAME');
  const password = this.env('APP_INVALID_PASSWORD');
  await this.loginPage.login(username, password);
});

Then('I should see an error message', async function (this: CustomWorld) {
  const expectedError = this.env('EXPECTED_ERROR_TEXT');
  const actualError = await this.loginPage.getLoginErrorMessage();

  expect(actualError).toContain(expectedError);
});

// ---------------------------------------------------------------
// Shared navigation guard (AC3/AC4/AC5)
// ---------------------------------------------------------------

Then('I should remain on the login page', async function (this: CustomWorld) {
  expect(await this.loginPage.isOnLoginPage()).toBe(true);
});

// ---------------------------------------------------------------
// US00-AC4 — Required fields (empty submit)
// ---------------------------------------------------------------

When('I click the sign in button with empty fields', async function (this: CustomWorld) {
  await this.loginPage.clickSignInWithEmptyFields();
});

// ---------------------------------------------------------------
// US00-AC5 — Email format validation
// ---------------------------------------------------------------

When('I enter an invalid email format', async function (this: CustomWorld) {
  await this.loginPage.submitInvalidEmailFormat();
});

// Shared message assertion for AC4/AC5 (reads data-testid="login-error")
Then('I should see the message {string}', async function (this: CustomWorld, expected: string) {
  const actualError = await this.loginPage.getLoginErrorMessage();
  expect(actualError).toContain(expected);
});

// ---------------------------------------------------------------
// US00-AC6 — Password masking
// ---------------------------------------------------------------

When('I enter the password {string}', async function (this: CustomWorld, password: string) {
  await this.loginPage.enterPassword(password);
});

Then('the password field should mask the characters', async function (this: CustomWorld) {
  expect(await this.loginPage.isPasswordMasked()).toBe(true);
});

