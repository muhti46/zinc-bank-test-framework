import type { Locator, Page } from 'playwright';

/**
 * Page Object for the "Move money" (transfers) page of ZincBank.
 *
 * Wraps the transfer form - source account, destination account, amount,
 * memo and submit button - plus the success / error messages the page
 * renders after an attempt, so step definitions never deal with raw
 * selectors.
 *
 * Target application: ZincBank (https://zincbank.cydeo.io) - a simulated
 * bank for testing education.
 *
 * Locator contract: data-testid="{page}-{component}-{action|field}".
 * Known transfer ids (verified against the live app 2026-09-10):
 *   transfer-from, transfer-to, transfer-amount, transfer-submit
 *   (transfer-memo may exist but is optional; no transfer-form wrapper)
 * Messages: plain <div class="text-subtle"> elements (no data-testid).
 * Success: "Transferred — new balance $X,XXX.XX." (US03-AC2)
 * Errors:  "INSUFFICIENT_FUNDS" (US03-AC3), "INVALID_AMOUNT" (bad input)
 */
export class MoveMoneyPage {
  private readonly page: Page;

  readonly transferFrom: Locator;
  readonly transferTo: Locator;
  readonly transferAmount: Locator;
  readonly transferMemo: Locator;
  readonly transferSubmit: Locator;

  constructor(page: Page) {
    this.page = page;

    this.transferFrom = page.locator('[data-testid="transfer-from"]');
    this.transferTo = page.locator('[data-testid="transfer-to"]');
    this.transferAmount = page.locator('[data-testid="transfer-amount"]');
    this.transferMemo = page.locator('[data-testid="transfer-memo"]');
    this.transferSubmit = page.locator('[data-testid="transfer-submit"]');
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

  /** Opens the Move money page via sidebar navigation (SPA-safe). */
  async navigateToMoveMoneyPage(): Promise<void> {
    // Click the "Move money" sidebar item — direct URL goto in the Next.js
    // SPA can race with the auth session and redirect back to login.
    const navMoveMoney = this.page.locator('[data-testid="nav-move-money"]');
    await navMoveMoney.waitFor({ state: 'visible', timeout: 15_000 });
    await navMoveMoney.click();
    await this.transferFrom.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** True when the transfer form is visible (the source account select). */
  async isTransferFormVisible(): Promise<boolean> {
    return this.transferFrom.isVisible();
  }

  /** True when the source account select is visible. */
  async isSourceAccountSelectVisible(): Promise<boolean> {
    return this.transferFrom.isVisible();
  }

  /** True when the destination account select is visible. */
  async isDestinationAccountSelectVisible(): Promise<boolean> {
    return this.transferTo.isVisible();
  }

  /** True when the amount input is visible. */
  async isAmountFieldVisible(): Promise<boolean> {
    return this.transferAmount.isVisible();
  }

  /** True when the submit button is visible. */
  async isTransferButtonVisible(): Promise<boolean> {
    return this.transferSubmit.isVisible();
  }

  /** Returns the account option labels currently shown in a select. */
  private async selectOptionLabels(select: Locator): Promise<string[]> {
    await select.waitFor({ state: 'visible', timeout: 15_000 });
    return select.locator('option').allTextContents();
  }

  /** Returns the source account option labels (e.g. "Checking Account"). */
  async getSourceAccountOptions(): Promise<string[]> {
    return this.selectOptionLabels(this.transferFrom);
  }

  /** Returns the destination account option labels. */
  async getDestinationAccountOptions(): Promise<string[]> {
    return this.selectOptionLabels(this.transferTo);
  }

  /**
   * Selects the option whose label contains `keyword` (case-insensitive).
   * The live app labels change with data resets ("Checking Account",
   * "Checking - $1,234.56", ...), so a keyword match is more robust than an
   * exact label.
   */
  private async selectByKeyword(select: Locator, keyword: string): Promise<void> {
    const options = await this.selectOptionLabels(select);
    const match = options.find((label) =>
      label.toLowerCase().includes(keyword.trim().toLowerCase())
    );
    if (!match) {
      throw new Error(
        `No option containing "${keyword}" in [${options.join(', ')}]`
      );
    }
    await select.selectOption({ label: match });
  }

  /**
   * Fills and submits the transfer form.
   * `from` / `to` are keywords matched against the account option labels.
   */
  async transfer(from: string, to: string, amount: string, memo = ''): Promise<void> {
    await this.selectByKeyword(this.transferFrom, from);
    await this.selectByKeyword(this.transferTo, to);
    await this.transferAmount.fill(amount);
    if (memo) {
      await this.transferMemo.fill(memo);
    }
    await this.transferSubmit.click();
  }

  /** True when the current URL still points at the Move money page. */
  async isOnMoveMoneyPage(): Promise<boolean> {
    return this.page.url().includes('/move-money');
  }

  /**
   * Returns the transfer success message text ('' if absent).
   * Format: "Transferred — new balance $X,XXX.XX." (US03-AC2).
   * The message has no data-testid — it is a plain <div class="text-subtle">.
   */
  async getSuccessMessage(): Promise<string> {
    try {
      const message = this.page
        .locator('div.text-subtle')
        .filter({ hasText: /Transferred/i })
        .first();
      await message.waitFor({ state: 'visible', timeout: 15_000 });
      return (await message.textContent() ?? '').trim();
    } catch {
      return '';
    }
  }

  /** True when a success message with the "Transferred" prefix is visible. */
  async isSuccessMessageVisible(): Promise<boolean> {
    return (await this.getSuccessMessage()).length > 0;
  }

  /**
   * Parses the "new balance" amount (e.g. from
   * "Transferred — new balance $1,234.56.") and returns it as a string in
   * "1234.56" form ('' when the message or the amount is missing).
   */
  async getNewBalanceFromSuccessMessage(): Promise<string> {
    const message = await this.getSuccessMessage();
    const match = message.match(/new balance \$([\d,]+\.\d{2})/i);
    return match ? match[1].replace(/,/g, '') : '';
  }

  /**
   * Returns the error text of the transfer form ('' if absent).
   * The app shows error codes in a plain <div class="text-subtle">.
   * Known errors: INSUFFICIENT_FUNDS, INVALID_AMOUNT.
   */
  async getErrorMessage(): Promise<string> {
    try {
      const message = this.page
        .locator('div.text-subtle')
        .filter({ hasText: /INSUFFICIENT_FUNDS|INVALID_AMOUNT/i })
        .first();
      await message.waitFor({ state: 'visible', timeout: 15_000 });
      return (await message.textContent() ?? '').trim();
    } catch {
      return '';
    }
  }

  /** True when the "INSUFFICIENT_FUNDS" error is visible. */
  async isErrorMessageVisible(): Promise<boolean> {
    return (await this.getErrorMessage()).length > 0;
  }

  /**
   * Reads the balance embedded in a visible account option label if the app
   * shows one (e.g. "Checking — $1,234.56" → "1234.56"), else ''.
   * Used to cross-check the success message against the live source balance.
   */
  async getBalanceFromSourceOption(): Promise<string> {
    try {
      await this.transferFrom.waitFor({ state: 'visible', timeout: 10_000 });
      const label = await this.transferFrom.locator('option:checked').textContent();
      const match = (label ?? '').match(/\$([\d,]+\.\d{2})/);
      return match ? match[1].replace(/,/g, '') : '';
    } catch {
      return '';
    }
  }
}