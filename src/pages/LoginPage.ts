import type { Locator, Page } from 'playwright';

/**
 * Page Object for the Login page.
 *
 * A Page Object wraps the locators and actions of ONE page/screen so that
 * step definitions never have to deal with raw Playwright selectors.
 *
 * Target application: ZincBank (https://zincbank.cydeo.io) - a simulated
 * bank for testing education.
 */
export class LoginPage {
  private readonly page: Page;

  // ---- Locators ----------------------------------------------------------
  readonly usernameInput: Locator; // Email field (labelled "Email")
  readonly passwordInput: Locator;
  readonly loginButton: Locator; // "Sign in"
  readonly errorMessage: Locator;
  readonly successIndicator: Locator; // Element only visible after a successful login
  readonly applyLink: Locator; // "Open an account" link (US00-AC1)
  readonly branding: Locator; // "Sign in to ZincBank" heading (US00-AC1)

  constructor(page: Page) {
    this.page = page;

    // ZincBank uses stable data-testid attributes on every element.
    this.usernameInput = page.locator('[data-testid="login-email-input"]');
    this.passwordInput = page.locator('[data-testid="login-password-input"]');
    this.loginButton = page.locator('[data-testid="login-submit"]');
    this.errorMessage = page.locator('[data-testid="login-error"]');
    this.successIndicator = page.locator('[data-testid="dashboard-welcome"]');
    this.applyLink = page.locator('[data-testid="login-apply-link"]');
    this.branding = page.getByRole('heading', { name: /zincbank/i });
  }

  /** Opens the login page using the BASE_URL from the .env file. */
  async navigateToLoginPage(): Promise<void> {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error(
        'BASE_URL is not set. Copy .env.example to .env and fill in your BASE_URL.'
      );
    }
    // Wait for the DOM to be ready, then wait for the form to be interactive.
    await this.page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    
    // Extra safety: wait for the email input to exist and be ready to interact.
    // This prevents race conditions where the page loads but JS hasn't rendered the form yet.
    await this.usernameInput.waitFor({ state: 'attached', timeout: 15_000 });
    // Give the framework a moment to fully render the form.
    await this.page.waitForTimeout(500);
  }

  /** Types the credentials and clicks the login button. */
  async login(username: string, password: string): Promise<void> {
    // Wait for the email field to be visible and ready for input.
    await this.usernameInput.waitFor({ state: 'visible', timeout: 15_000 });
    // Ensure the input is in focus and ready
    await this.usernameInput.focus();
    await this.page.waitForTimeout(100);
    
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    
    // Wait a moment before clicking to ensure the form is fully settled
    await this.page.waitForTimeout(200);
    await this.loginButton.click();
  }

  /**
   * Returns the text of the login error message ('' if the message never appears).
   *
   * AC3 (invalid credentials) and AC4/AC5 (validation) all surface their message
   * in the SAME element (data-testid="login-error").
   *
   * Robustness fix (Healer): the old implementation polled with a fixed
   * waitForTimeout(500) + isVisible() which raced with the network/app response
   * and produced a spurious empty string. We now use a proper Playwright
   * waitFor({ state: 'visible' }) so the assertion only runs once the app has
   * really rendered the message.
   */
  async getLoginErrorMessage(): Promise<string> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 15_000 });
      const message = await this.errorMessage.textContent();
      return (message ?? '').trim();
    } catch {
      return '';
    }
  }

  /**
   * Returns true when the login was successful.
   *
   * ZincBank redirects to /dashboard after a successful login and shows the
   * "Welcome" heading (data-testid="dashboard-welcome").
   *
   * The check is robust: we wait for BOTH the URL to change AND the success indicator
   * to be visible. This handles network delays and rendering delays separately.
   */
  async isLoginSuccessful(): Promise<boolean> {
    try {
      // Strategy: wait for the success indicator which should only appear on /dashboard
      // This is more reliable than waiting for URL alone or element alone
      // Use a longer timeout to account for:
      //   1. Network latency (server processing)
      //   2. Browser navigation
      //   3. JavaScript rendering
      await this.successIndicator.waitFor({ state: 'visible', timeout: 30_000 });
      
      // Verify we're actually on the dashboard page
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/dashboard')) {
        console.warn(
          `⚠️  Success indicator visible but unexpected URL: ${currentUrl}`
        );
        return false;
      }
      
      return true;
    } catch (error) {
      const currentUrl = this.page.url();
      console.error(
        `❌ Login success check failed after ${error instanceof Error ? error.message : 'unknown error'}`
      );
      console.error(`   Current URL: ${currentUrl}`);
      return false;
    }
  }

  // ----------------------------------------------------------------
  // US00-AC1 — Login form element checks
  // ----------------------------------------------------------------

  /** True when the ZincBank branding heading ("Sign in to ZincBank") is visible. */
  async isBrandingVisible(): Promise<boolean> {
    return this.branding.isVisible();
  }

  /** True when the "Open an account" link is visible. */
  async isApplyLinkVisible(): Promise<boolean> {
    return this.applyLink.isVisible();
  }

  /** True when the Email field is visible. */
  async isEmailFieldVisible(): Promise<boolean> {
    return this.usernameInput.isVisible();
  }

  /** True when the Password field is visible. */
  async isPasswordFieldVisible(): Promise<boolean> {
    return this.passwordInput.isVisible();
  }

  /** True when the Sign in button is visible. */
  async isSignInButtonVisible(): Promise<boolean> {
    return this.loginButton.isVisible();
  }

  // ----------------------------------------------------------------
  // US00-AC4 — Submit with empty Email AND Password
  // ----------------------------------------------------------------

  /** Clicks Sign in with both fields empty to trigger client-side validation. */
  async clickSignInWithEmptyFields(): Promise<void> {
    await this.usernameInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.usernameInput.fill('');
    await this.passwordInput.fill('');
    await this.loginButton.click();
  }

  // ----------------------------------------------------------------
  // US00-AC5 — Invalid email format
  // ----------------------------------------------------------------

  /** Fills a syntactically invalid email and submits the form. */
  async submitInvalidEmailFormat(): Promise<void> {
    await this.usernameInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.usernameInput.fill('not-an-email');
    await this.passwordInput.fill('somepass');
    await this.loginButton.click();
  }

  // ----------------------------------------------------------------
  // US00-AC6 — Password masking
  // ----------------------------------------------------------------

  /** Types a password so the masking behaviour can be asserted. */
  async enterPassword(password: string): Promise<void> {
    await this.passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.passwordInput.fill(password);
  }

  /**
   * True when the Password field masks its content.
   * The app renders the field with type="password", which is the standard
   * browser mechanism for bullet-masking typed characters.
   */
  async isPasswordMasked(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'password';
  }

  // ----------------------------------------------------------------
  // Navigation guards
  // ----------------------------------------------------------------

  /** True when the browser is still on the login page (URL contains /login). */
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }

  /** True when the browser reached the dashboard (URL contains /dashboard). */
  async isOnDashboard(): Promise<boolean> {
    return this.page.url().includes('/dashboard');
  }
}
