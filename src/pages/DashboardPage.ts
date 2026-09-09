import type { Locator, Page } from 'playwright';

/**
 * Page Object for the authenticated Dashboard area of ZincBank.
 *
 * Wraps the dashboard-welcome indicator, the balance overview and the
 * primary sidebar navigation (DASHBOARD / ACCOUNTS / MOVE MONEY /
 * TRANSACTIONS / CARDS / PROFILE / Sign out) so step definitions never
 * deal with raw selectors.
 *
 * Target application: ZincBank (https://zincbank.cydeo.io) - a simulated
 * bank for testing education.
 */
export class DashboardPage {
  private readonly page: Page;

  // ---- Locators ----------------------------------------------------------
  readonly welcome: Locator; // "Welcome" heading, only visible when authenticated (US01-AC2)
  readonly totalDeposit: Locator; // Account overview balance (US01-AC2)
  readonly signOutButton: Locator; // "Sign out" (US01-AC5/AC6)

  /** Maps a human-readable sidebar label to its stable data-testid. */
  private static readonly NAV_TESTID: Record<string, string> = {
    dashboard: 'nav-dashboard',
    accounts: 'nav-accounts',
    'move money': 'nav-move-money',
    transactions: 'nav-transactions',
    cards: 'nav-cards',
    profile: 'nav-profile',
    'sign out': 'nav-signout'
  };

  constructor(page: Page) {
    this.page = page;

    // ZincBank uses stable data-testid attributes on every element.
    this.welcome = page.locator('[data-testid="dashboard-welcome"]');
    this.totalDeposit = page.locator('[data-testid="dashboard-total-deposit"]');
    this.signOutButton = page.locator('[data-testid="nav-signout"]');
  }

  // ---- Private helpers ---------------------------------------------------

  private static normalize(label: string): string {
    return label.trim().toLowerCase();
  }

  /** Returns the data-testid for a sidebar label (throws for unknown labels). */
  private navTestIdFor(label: string): string {
    const key = DashboardPage.normalize(label);
    const testId = DashboardPage.NAV_TESTID[key];
    if (!testId) {
      throw new Error(
        `Unknown sidebar navigation element "${label}". ` +
          `Known elements: ${Object.keys(DashboardPage.NAV_TESTID).join(', ')}`
      );
    }
    return testId;
  }

  private navItem(label: string): Locator {
    return this.page.locator(`[data-testid="${this.navTestIdFor(label)}"]`);
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

  // ---- AC1/AC2/AC3 — authenticated state ----------------------------------

  /** True when the authenticated dashboard welcome heading is visible. */
  async isWelcomeVisible(): Promise<boolean> {
    return this.welcome.isVisible();
  }

  /** True when the account overview (total deposit) is visible. */
  async isBalanceOverviewVisible(): Promise<boolean> {
    return this.totalDeposit.isVisible();
  }

  /** True when any protected dashboard content is rendered. */
  async isProtectedContentVisible(): Promise<boolean> {
    return this.welcome.isVisible();
  }

  /** True when the current URL path contains the given route (e.g. '/dashboard'). */
  async isOnPage(route: string): Promise<boolean> {
    return this.page.url().includes(route);
  }

  /** True when the current URL path contains '/login'. */
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }

  /** Waits until the URL path matches `route` (handles SPA client-side routing). */
  async waitForRoute(route: string, timeout = 15_000): Promise<void> {
    await this.page.waitForURL((url) => url.pathname === route, { timeout });
  }

  /** Navigates directly to a route (e.g. '/dashboard') inside the current session. */
  async visitRoute(route: string): Promise<void> {
    await this.page.goto(this.appBaseUrl() + route, {
      waitUntil: 'domcontentloaded'
    });
  }

  // ---- AC5 — sidebar navigation elements ----------------------------------

  /** True when the sidebar navigation element for `label` is visible. */
  async isNavItemVisible(label: string): Promise<boolean> {
    const item = this.navItem(label);
    await item.waitFor({ state: 'visible', timeout: 15_000 });
    return item.isVisible();
  }

  /** True when the sidebar navigation element for `label` renders a Lucide icon. */
  async navItemHasIcon(label: string): Promise<boolean> {
    const item = this.navItem(label);
    await item.waitFor({ state: 'visible', timeout: 15_000 });
    return (await item.locator('svg.lucide').count()) > 0;
  }

  /** Clicks the sidebar navigation element for `label`. */
  async clickNavItem(label: string): Promise<void> {
    const item = this.navItem(label);
    await item.waitFor({ state: 'visible', timeout: 15_000 });
    await item.click();
  }

  // ---- AC6/AC7 — sign out -------------------------------------------------

  /** Clicks the "Sign out" button in the sidebar. */
  async signOut(): Promise<void> {
    await this.signOutButton.waitFor({ state: 'visible', timeout: 15_000 });
    await this.signOutButton.click();
  }

  /**
   * True when the session was terminated: the dashboard is gone and the
   * login form is shown instead.
   */
  async isLoggedOut(): Promise<boolean> {
    const welcomeGone = !(await this.welcome.isVisible().catch(() => true));
    const loginFormVisible =
      (await this.page.locator('[data-testid="login-email-input"]').count()) > 0;
    return welcomeGone && loginFormVisible;
  }
}
