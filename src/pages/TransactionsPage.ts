import type { Locator, Page } from 'playwright';

/**
 * Page Object for the Transactions (statements & history) page of ZincBank.
 *
 * Wraps the account selector, the balance readout and the transaction list
 * so step definitions can assert that a transfer was (or was not) recorded.
 *
 * Target application: ZincBank (https://zincbank.cydeo.io) - a simulated
 * bank for testing education.
 *
 * Locator contract: data-testid="{page}-{component}-{action|field}".
 * Known transaction ids (verified against the live app):
 *   transactions-view, transactions-account, transactions-balance,
 *   transactions-from, transactions-to, transactions-apply,
 *   transactions-period, transactions-statement, transactions-empty,
 *   transactions-total, transactions-prev, transactions-next
 */
export class TransactionsPage {
  private readonly page: Page;

  readonly view: Locator;
  readonly accountSelect: Locator;
  readonly balance: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.view = page.locator('[data-testid="transactions-view"]');
    this.accountSelect = page.locator('[data-testid="transactions-account"]');
    this.balance = page.locator('[data-testid="transactions-balance"]');
    this.emptyMessage = page.locator('[data-testid="transactions-empty"]');
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

  /** Opens the Transactions page via sidebar navigation (SPA-safe). */
  async navigateToTransactionsPage(): Promise<void> {
    const navTransactions = this.page.locator('[data-testid="nav-transactions"]');
    await navTransactions.waitFor({ state: 'visible', timeout: 15_000 });
    await navTransactions.click();
    await this.view.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** True when the transactions view (history) is visible. */
  async isViewVisible(): Promise<boolean> {
    return this.view.isVisible();
  }

  /** True when the page lists NO transactions at all. */
  async isEmptyStateVisible(): Promise<boolean> {
    try {
      await this.emptyMessage.waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Returns the account option labels of the account selector. */
  async getAccountOptions(): Promise<string[]> {
    await this.accountSelect.waitFor({ state: 'visible', timeout: 15_000 });
    return this.accountSelect.locator('option').allTextContents();
  }

  /**
   * Selects the account whose label contains `keyword` (case-insensitive).
   */
  async selectAccountByKeyword(keyword: string): Promise<void> {
    const options = await this.getAccountOptions();
    const match = options.find((label) =>
      label.toLowerCase().includes(keyword.trim().toLowerCase())
    );
    if (!match) {
      throw new Error(
        `No account option containing "${keyword}" in [${options.join(', ')}]`
      );
    }
    await this.accountSelect.selectOption({ label: match });
  }

  /** True when some row in the transaction list contains `text`. */
  async isTransactionWithTextVisible(text: string): Promise<boolean> {
    try {
      await this.view
        .getByText(text, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the transaction row whose text contains `amount` (or null when
   * no row matches). Rows are matched inside the transactions view so an
   * amount appearing in page furniture (totals, filters) never counts.
   */
  async findTransactionRow(amount: string): Promise<Locator | null> {
    try {
      const row = this.view.getByText(amount, { exact: false }).first();
      await row.waitFor({ state: 'visible', timeout: 10_000 });
      return row;
    } catch {
      return null;
    }
  }
}