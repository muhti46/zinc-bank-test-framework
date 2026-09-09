import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import { CustomWorld } from '../support/world';
import { ApplyPage, type AppliedCustomer } from '../pages/ApplyPage';

// ---------------------------------------------------------------
// US02 — Customer Profile (view/edit profile info + password).
// Step definitions only use high-level Page Object methods - there
// are NO raw Playwright locators or selectors in this file.
//
// Data strategy: the profile edit form only exists for customers who
// completed the "Open an account" wizard, so the scenarios that need it
// provision a fresh throwaway customer (unique email per run) and sign in
// as that customer. The APP_* environment account is only used by the
// scenarios that inspect the Change password section / trigger rejections,
// which never alter that account. Nothing here is shared state - each
// scenario owns its account, so local and Jenkins runs are identical.
// ---------------------------------------------------------------

/** Synthetic values typed over the registered ones (US02-AC2). */
const TYPED_PROFILE = {
  first: 'Alex',
  last: 'Rivera',
  phone: '2025557777',
  address: '42 Cedar Street'
} as const;

/** Synthetic values used by the save + persistence scenario (US02-AC3). */
const UPDATED_PROFILE = {
  first: 'Sam',
  last: 'Chen',
  phone: '2025558888',
  address: '77 Innovation Drive'
} as const;

/** The account created by the current scenario (see feature data strategy). */
function requireAccount(world: CustomWorld): AppliedCustomer {
  if (!world.account) {
    throw new Error(
      'No account was opened. The step "I open a new ZincBank customer account" must run first.'
    );
  }
  return world.account;
}

/** Signs into the given account and waits for the dashboard to be ready. */
async function signInAs(world: CustomWorld, email: string, password: string): Promise<void> {
  await world.loginPage.navigateToLoginPage();
  await world.loginPage.login(email, password);
  await world.dashboardPage.waitForRoute('/dashboard');
}

// ---------------------------------------------------------------
// Provisioning + navigation
// ---------------------------------------------------------------

/** Opens a fresh throwaway customer through the bank's own wizard. */
When('I open a new ZincBank customer account', async function (this: CustomWorld) {
  this.account = await this.applyPage.applyForNewCustomer(
    ApplyPage.DEFAULT_PASSWORD
  );
});

/** Signs in as the customer that was just opened (original password). */
When(
  'I sign in with the account I just opened',
  async function (this: CustomWorld) {
    const account = requireAccount(this);
    await signInAs(this, account.email, account.password);
  }
);

/** Signs in as the customer that was just opened, using the NEW password. */
When(
  'I sign in with the account I just opened using my new password',
  async function (this: CustomWorld) {
    const account = requireAccount(this);
    if (!this.changedPassword) {
      throw new Error(
        'No new password recorded. The step "I change my password to ..." must run first.'
      );
    }
    await signInAs(this, account.email, this.changedPassword);
  }
);

/** Opens the Profile page from the dashboard sidebar. */
When('I open my Profile page', async function (this: CustomWorld) {
  await this.dashboardPage.clickNavItem('Profile');
  await this.dashboardPage.waitForRoute('/profile');
  await this.profilePage.waitUntilLoaded();
});

// ---------------------------------------------------------------
// US02-AC1 — Profile information display
// ---------------------------------------------------------------

Then(
  'the profile fields should display the personal information I registered',
  async function (this: CustomWorld) {
    const account = requireAccount(this);
    const displayed = await this.profilePage.getDisplayedProfile();
    expect(displayed.first).toBe(account.profile.first);
    expect(displayed.last).toBe(account.profile.last);
    expect(displayed.phone).toBe(account.profile.phone);
    expect(displayed.address).toBe(account.profile.address);
  }
);

Then(
  'the email field should display the email address I registered',
  async function (this: CustomWorld) {
    const account = requireAccount(this);
    const displayed = await this.profilePage.getDisplayedProfile();
    expect(displayed.email).toBe(account.email);
  }
);
// ---------------------------------------------------------------
// US02-AC2 — Profile field editability
// ---------------------------------------------------------------

When(
  'I type new values into the editable profile fields',
  async function (this: CustomWorld) {
    await this.profilePage.fillProfileFields(TYPED_PROFILE);
  }
);

Then('the profile fields should show the values I typed', async function (this: CustomWorld) {
  const displayed = await this.profilePage.getDisplayedProfile();
  expect(displayed.first).toBe(TYPED_PROFILE.first);
  expect(displayed.last).toBe(TYPED_PROFILE.last);
  expect(displayed.phone).toBe(TYPED_PROFILE.phone);
  expect(displayed.address).toBe(TYPED_PROFILE.address);
});

Then(
  'the email field should be displayed as read-only',
  async function (this: CustomWorld) {
    expect(await this.profilePage.isEmailReadOnly()).toBe(true);
  }
);

// ---------------------------------------------------------------
// US02-AC3 — Save profile changes (persistence after reload)
// ---------------------------------------------------------------

When('I update my profile information', async function (this: CustomWorld) {
  await this.profilePage.fillProfileFields(UPDATED_PROFILE);
});

When('I save my profile changes', async function (this: CustomWorld) {
  await this.profilePage.saveProfileChanges();
});

Then(
  'I should see the profile message {string}',
  async function (this: CustomWorld, expected: string) {
    const status = await this.profilePage.getProfileStatusText();
    expect(status).toContain(expected);
  }
);

When('I reload the profile page', async function (this: CustomWorld) {
  await this.page.reload({ waitUntil: 'domcontentloaded' });
  await this.dashboardPage.waitForRoute('/profile');
  await this.profilePage.waitForProfileForm();
});

Then(
  'my updated profile information should still be displayed',
  async function (this: CustomWorld) {
    const displayed = await this.profilePage.getDisplayedProfile();
    expect(displayed.first).toBe(UPDATED_PROFILE.first);
    expect(displayed.last).toBe(UPDATED_PROFILE.last);
    expect(displayed.phone).toBe(UPDATED_PROFILE.phone);
    expect(displayed.address).toBe(UPDATED_PROFILE.address);
  }
);

// ---------------------------------------------------------------
// US02-AC4 — Change password section
// ---------------------------------------------------------------

Then('I should see the Change password section', async function (this: CustomWorld) {
  expect(await this.profilePage.isChangePasswordSectionVisible()).toBe(true);
});

Then('I should see the current password field', async function (this: CustomWorld) {
  expect(await this.profilePage.isCurrentPasswordFieldVisible()).toBe(true);
});

Then('I should see the new password field', async function (this: CustomWorld) {
  expect(await this.profilePage.isNewPasswordFieldVisible()).toBe(true);
});

Then('I should see the "Change password" button', async function (this: CustomWorld) {
  expect(await this.profilePage.isChangePasswordButtonVisible()).toBe(true);
});

// ---------------------------------------------------------------
// US02-AC5 — Password field security (masking)
// ---------------------------------------------------------------

When(
  'I type {string} into the current password field',
  async function (this: CustomWorld, value: string) {
    await this.profilePage.enterCurrentPassword(value);
  }
);

When(
  'I type {string} into the new password field',
  async function (this: CustomWorld, value: string) {
    await this.profilePage.enterNewPassword(value);
  }
);

Then(
  'the current password field should mask the entered characters',
  async function (this: CustomWorld) {
    expect(await this.profilePage.isPasswordFieldMasked('current')).toBe(true);
  }
);

Then(
  'the new password field should mask the entered characters',
  async function (this: CustomWorld) {
    expect(await this.profilePage.isPasswordFieldMasked('new')).toBe(true);
  }
);
// ---------------------------------------------------------------
// US02-AC6/AC7/AC8/AC9 — Password change attempts + messages
// ---------------------------------------------------------------

/** Try to change the password using the current account's CURRENT password. */
When(
  'I try to change my password to {string}',
  async function (this: CustomWorld, newPassword: string) {
    const account = requireAccount(this);
    await this.profilePage.submitPasswordChange(account.password, newPassword);
  }
);

/** Try to change the password using an explicitly wrong current password. */
When(
  'I try to change my password to {string} with the current password {string}',
  async function (this: CustomWorld, newPassword: string, currentPassword: string) {
    await this.profilePage.submitPasswordChange(currentPassword, newPassword);
  }
);

/**
 * Change the password using the current account's CURRENT password and record
 * the new value so a later step can sign in with it (US02-AC7/AC9).
 */
When(
  'I change my password to {string}',
  async function (this: CustomWorld, newPassword: string) {
    const account = requireAccount(this);
    await this.profilePage.submitPasswordChange(account.password, newPassword);
    this.changedPassword = newPassword;
  }
);

/** Shared assertion for the profile page status messages ("Password changed",
 *  "Current password is incorrect", "New password must be at least ..."). */
Then(
  'I should see the password message {string}',
  async function (this: CustomWorld, expected: string) {
    const status = await this.profilePage.getPasswordStatusText();
    expect(status).toContain(expected);
  }
);

/** The password attempt must never log the customer out of the Profile page. */
Then('I should remain on the Profile page', async function (this: CustomWorld) {
  await this.dashboardPage.waitForRoute('/profile');
  expect(await this.profilePage.isChangePasswordSectionVisible()).toBe(true);
});
