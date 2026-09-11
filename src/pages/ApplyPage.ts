import type { Locator, Page } from 'playwright';

/**
 * The customer data a freshly opened ZincBank account is registered with.
 * `email` is unique per run; everything else is the deterministic synthetic
 * fixture the wizard is filled with (never a real person's data).
 */
export interface AppliedCustomer {
  email: string;
  password: string;
  profile: {
    first: string;
    last: string;
    phone: string;
    address: string;
  };
}

/**
 * Page Object for the "Open an account" wizard of ZincBank
 * (https://zincbank.cydeo.io/apply).
 *
 * The ZincBank demo only creates a customer PROFILE (the record the Profile
 * page edits) when the customer goes through this 6-step application:
 *   0. Choose accounts   1. About you      2. Identity (simulated)
 *   3. Your address      4. Security       5. Terms + submit
 * A legacy email/password-only account has NO profile on file, so the Profile
 * page hides its edit form for such accounts. The US002 profile scenarios
 * therefore provision a fresh throwaway customer through this wizard (unique
 * email per run) and never touch any shared account.
 *
 * Transfer scenarios (US003) additionally need BOTH a Checking and a Savings
 * account - `applyForNewCustomerWithOptions({ openSavings: true })` ticks the
 * "Open a savings account" checkbox on step 0 so the customer gets both.
 */
export class ApplyPage {
  private readonly page: Page;

  /**
   * Wizard field/appearance timeout. The demo app is slow under Jenkins
   * (CI controller + cold npm start), so step transitions get generous
   * budget instead of the default 15-20s.
   */
  static readonly STEP_TIMEOUT_MS = 45_000;

  /**
   * Default (synthetic, non-secret) password every throwaway test customer is
   * opened with. Scenarios change it to another synthetic value.
   */
  static readonly DEFAULT_PASSWORD = 'ZincApply!2025';

  /** Synthetic (non-secret) fixture data used to open every test account. */
  static readonly CUSTOMER = {
    first: 'Taylor',
    last: 'Morgan',
    phone: '2025550100',
    address: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    ssn: '111-22-3333',
    dob: '1990-05-12'
  } as const;

  constructor(page: Page) {
    this.page = page;
  }

  /** Resolves the app root from BASE_URL (which points at /login). */
  private appBaseUrl(): string {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error(
        'BASE_URL is not set. Copy .env.example to .env and fill in your BASE_URL.'
      );
    }
    return baseUrl.replace(/\/login\/?$/, '');
  }

  /** Generates a unique email so every test account is independent. */
  private static nextEmail(): string {
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return `us02-${stamp}@zinc.test`;
  }

  // ---- Private wizard helpers ----------------------------------------

  private async clickContinue(nextFieldTestId: string): Promise<void> {
    const next = this.page.locator('[data-testid="apply-next"]');
    await next.waitFor({ state: 'visible', timeout: ApplyPage.STEP_TIMEOUT_MS });
    await next.click();
    // The SPA swaps the step section; wait for the next step's first field so
    // validation failures surface as a timeout instead of a silent no-op.
    await this.page
      .locator(`[data-testid="${nextFieldTestId}"]`)
      .waitFor({ state: 'visible', timeout: ApplyPage.STEP_TIMEOUT_MS });
  }

  // ---- Public wizard API ---------------------------------------------

  /** Opens a fresh throwaway customer with a Checking account only. */
  async applyForNewCustomer(password: string): Promise<AppliedCustomer> {
    return this.applyForNewCustomerWithOptions(password, { openSavings: false });
  }

  /**
   * Opens the account application and fills the wizard for a fresh throwaway
   * customer with the deterministic synthetic fixture (unique email).
   * Returns the created credentials + registered profile so later steps can
   * sign in as this customer and assert the Profile page shows this data.
   *
   * When `options.openSavings` is true the "Open a savings account" checkbox
   * on step 0 is ticked too, so the customer has BOTH a Checking and a
   * Savings account (required for transfer scenarios).
   */
  async applyForNewCustomerWithOptions(
    password: string,
    options: { openSavings: boolean }
  ): Promise<AppliedCustomer> {
    await this.page.goto(`${this.appBaseUrl()}/apply`, {
      waitUntil: 'domcontentloaded'
    });

    const { first, last, phone, dob, ssn, address, city, state, zip } =
      ApplyPage.CUSTOMER;
    const email = ApplyPage.nextEmail();

    // Step 0 - Choose your accounts. Checking is included by default;
    // optionally open Savings alongside it (transfer scenarios need both).
    await this.page
      .locator('[data-testid="apply-step-0"]')
      .waitFor({ state: 'visible', timeout: ApplyPage.STEP_TIMEOUT_MS });
    if (options.openSavings) {
      await this.page.locator('[data-testid="apply-account-savings-toggle"]').check();
    }
    await this.clickContinue('apply-firstname-input');

    // Step 1 - About you.
    await this.page.locator('[data-testid="apply-firstname-input"]').fill(first);
    await this.page.locator('[data-testid="apply-lastname-input"]').fill(last);
    await this.page.locator('[data-testid="apply-email-input"]').fill(email);
    await this.page.locator('[data-testid="apply-phone-input"]').fill(phone);
    await this.page.locator('[data-testid="apply-dob-input"]').fill(dob);
    await this.clickContinue('apply-ssn-input');

    // Step 2 - Identity (simulated).
    await this.page.locator('[data-testid="apply-ssn-input"]').fill(ssn);
    await this.page
      .locator('[data-testid="apply-employment-select"]')
      .selectOption({ label: 'Employed' });
    await this.clickContinue('apply-addressline-input');

    // Step 3 - Your address.
    await this.page.locator('[data-testid="apply-addressline-input"]').fill(address);
    await this.page.locator('[data-testid="apply-city-input"]').fill(city);
    await this.page.locator('[data-testid="apply-state-select"]').selectOption({
      label: state
    });
    await this.page.locator('[data-testid="apply-zip-input"]').fill(zip);
    await this.clickContinue('apply-password-input');

    // Step 4 - Security.
    await this.page.locator('[data-testid="apply-password-input"]').fill(password);
    await this.page.locator('[data-testid="apply-confirm-input"]').fill(password);
    await this.clickContinue('apply-terms-checkbox');

    // Step 5 - accept the simulated terms and submit the application.
    const terms = this.page.locator('[data-testid="apply-terms-checkbox"]');
    await terms.check();
    const submit = this.page.locator('[data-testid="apply-submit"]');
    await submit.click();

    // The approval screen confirms the account + profile were created; only
    // then are the credentials usable for the sign-in that follows.
    await this.page
      .getByText('Continue to dashboard', { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: ApplyPage.STEP_TIMEOUT_MS });

    return {
      email,
      password,
      profile: { first, last, phone, address }
    };
  }
}
