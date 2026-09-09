import type { Locator, Page } from 'playwright';

/**
 * Page Object for the authenticated Profile page of ZincBank.
 *
 * The Profile page has two independent areas:
 *   1. A "Profile" form (data-testid="profile-form") with the customer's
 *      First name / Last name / Phone / Address (editable) and Email
 *      (read-only) plus the "Save changes" button. This form is only
 *      rendered when the signed-in customer has a profile on file
 *      (`/api/profile` returned data) - customers who only registered an
 *      email/password see just the change-password section below.
 *   2. A "Change password" form (data-testid="profile-password-form") with
 *      Current password / New password fields and the "Change password"
 *      button. It is always rendered for any authenticated customer.
 *
 * Target application: ZincBank (https://zincbank.cydeo.io) - a simulated
 * bank for testing education.
 */
export class ProfilePage {
  private readonly page: Page;

  // ---- Profile information form ------------------------------------
  readonly profileView: Locator; // Whole page section (data-testid="profile-view")
  readonly profileForm: Locator; // Edit form, only present when a profile exists
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly addressInput: Locator;
  readonly emailInput: Locator; // Read-only (disabled + readonly)
  readonly saveButton: Locator; // "Save changes"
  readonly formStatus: Locator; // Message under the profile form (e.g. "Profile saved")

  // ---- Change password form ----------------------------------------
  readonly changePasswordHeading: Locator; // "Change password" heading
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly changePasswordButton: Locator; // "Change password"
  readonly passwordStatus: Locator; // Message under the password form

  constructor(page: Page) {
    this.page = page;

    this.profileView = page.locator('[data-testid="profile-view"]');
    this.profileForm = page.locator('[data-testid="profile-form"]');
    this.firstNameInput = page.locator('[data-testid="profile-firstname-input"]');
    this.lastNameInput = page.locator('[data-testid="profile-lastname-input"]');
    this.phoneInput = page.locator('[data-testid="profile-phone-input"]');
    this.addressInput = page.locator('[data-testid="profile-addressline-input"]');
    this.emailInput = page.locator('[data-testid="profile-email-input"]');
    this.saveButton = page.locator('[data-testid="profile-save"]');
    this.formStatus = page.locator('[data-testid="profile-form-status"]');

    this.changePasswordHeading = page.getByRole('heading', {
      name: /change password/i
    });
    this.currentPasswordInput = page.locator(
      '[data-testid="profile-currentpassword-input"]'
    );
    this.newPasswordInput = page.locator('[data-testid="profile-newpassword-input"]');
    this.changePasswordButton = page.locator(
      '[data-testid="profile-changepassword-submit"]'
    );
    this.passwordStatus = page.locator('[data-testid="profile-password-status"]');
  }

  // ---- Loading ------------------------------------------------------

  /** Waits until the Profile page content has rendered. */
  async waitUntilLoaded(timeout = 15_000): Promise<void> {
    await this.profileView.waitFor({ state: 'visible', timeout });
  }

  /**
   * Waits until the profile edit form is visible. The app fetches the
   * profile from /api/profile after the page mounts, so the form appears
   * slightly after navigation - never assert on it before this resolves.
   */
  async waitForProfileForm(timeout = 25_000): Promise<void> {
    await this.profileForm.waitFor({ state: 'visible', timeout });
  }
  // ---- US02-AC1 — displayed values -----------------------------------

  /** Reads the current value of every profile field (incl. email). */
  async getDisplayedProfile(): Promise<{
    first: string;
    last: string;
    phone: string;
    address: string;
    email: string;
  }> {
    await this.waitForProfileForm();
    return {
      first: await this.firstNameInput.inputValue(),
      last: await this.lastNameInput.inputValue(),
      phone: await this.phoneInput.inputValue(),
      address: await this.addressInput.inputValue(),
      email: await this.emailInput.inputValue()
    };
  }

  // ---- US02-AC2 — editability ----------------------------------------

  /** True when the email field is rendered read-only (disabled + readonly). */
  async isEmailReadOnly(): Promise<boolean> {
    const disabled = await this.emailInput.isDisabled().catch(() => false);
    const readonly = (await this.emailInput.getAttribute('readonly')) !== null;
    return disabled && readonly;
  }

  /** Fills the four editable profile fields (First, Last, Phone, Address). */
  async fillProfileFields(values: {
    first: string;
    last: string;
    phone: string;
    address: string;
  }): Promise<void> {
    await this.waitForProfileForm();
    await this.firstNameInput.fill(values.first);
    await this.lastNameInput.fill(values.last);
    await this.phoneInput.fill(values.phone);
    await this.addressInput.fill(values.address);
  }

  // ---- US02-AC3 — save & persistence ----------------------------------

  /** Clicks "Save changes" and waits until the status message appears. */
  async saveProfileChanges(): Promise<void> {
    await this.saveButton.click();
    await this.formStatus.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Text of the profile form status message (e.g. "Profile saved"). */
  async getProfileStatusText(): Promise<string> {
    await this.formStatus.waitFor({ state: 'visible', timeout: 15_000 });
    return (await this.formStatus.innerText()).trim();
  }

  // ---- US02-AC4 — Change password section -----------------------------

  /** True when the "Change password" section is visible on the page. */
  async isChangePasswordSectionVisible(): Promise<boolean> {
    await this.profileView.waitFor({ state: 'visible', timeout: 15_000 });
    return this.changePasswordHeading.isVisible();
  }

  /** True when the Current password field is visible. */
  async isCurrentPasswordFieldVisible(): Promise<boolean> {
    await this.profileView.waitFor({ state: 'visible', timeout: 15_000 });
    return this.currentPasswordInput.isVisible();
  }

  /** True when the New password field is visible. */
  async isNewPasswordFieldVisible(): Promise<boolean> {
    await this.profileView.waitFor({ state: 'visible', timeout: 15_000 });
    return this.newPasswordInput.isVisible();
  }

  /** True when the "Change password" submit button is visible. */
  async isChangePasswordButtonVisible(): Promise<boolean> {
    await this.profileView.waitFor({ state: 'visible', timeout: 15_000 });
    return this.changePasswordButton.isVisible();
  }

  // ---- US02-AC5 — password masking ------------------------------------

  /** Types a value into the Current password field. */
  async enterCurrentPassword(value: string): Promise<void> {
    await this.currentPasswordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.currentPasswordInput.fill(value);
  }

  /** Types a value into the New password field. */
  async enterNewPassword(value: string): Promise<void> {
    await this.newPasswordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.newPasswordInput.fill(value);
  }

  /**
   * True when the requested password field masks its content
   * (the app renders it with type="password").
   */
  async isPasswordFieldMasked(field: 'current' | 'new'): Promise<boolean> {
    const input =
      field === 'current' ? this.currentPasswordInput : this.newPasswordInput;
    const type = await input.getAttribute('type');
    return type === 'password';
  }

  // ---- US02-AC6/AC7/AC8/AC9 — change password -------------------------

  /**
   * Submits a password change using the given current + new password and
   * waits until the status message (success or error) is rendered.
   */
  async submitPasswordChange(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await this.enterCurrentPassword(currentPassword);
    await this.enterNewPassword(newPassword);
    await this.changePasswordButton.click();
    await this.passwordStatus.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Text of the password status message (success or validation error). */
  async getPasswordStatusText(): Promise<string> {
    await this.passwordStatus.waitFor({ state: 'visible', timeout: 15_000 });
    return (await this.passwordStatus.innerText()).trim();
  }
}
