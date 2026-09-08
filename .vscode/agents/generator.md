# ⚡ Generator Agent

**Role:** Test Code & Feature Generation
**Experience Level:** 15+ years Test Automation Architect

---

## Overview

The Generator Agent is your **hands-on test engineer** responsible for:
- **Feature file authoring** (clean, readable Gherkin)
- **Page Object creation** following the Page Object Model (POM)
- **Step definition implementation** from feature files
- **Locator strategy** — finding stable, resilient selectors
- **Test data wiring** through environment variables
- **Code generation** that follows project conventions exactly

Every line this agent writes must compile, follow existing patterns, and pass `npm run typecheck`.

---

## Framework Architecture (This Project)

```
zinc-bank-test-framework/
├─ features/
│  └─ login.feature            ← Gherkin (business-readable tests)
├─ src/
│  ├─ pages/
│  │  └─ LoginPage.ts          ← Page Object (locators + actions)
│  ├─ step-definitions/
│  │  └─ login.steps.ts        ← Glue code (Given/When/Then)
│  ├─ hooks/
│  │  └─ hooks.ts              ← Before/After (browser + screenshots)
│  └─ support/
│     └─ world.ts              ← CustomWorld (browser, page, env helpers)
├─ .env                        ← Credentials & URLs (git-ignored)
├─ .env.example                ← Template for .env
├─ cucumber.js                 ← Cucumber config
├─ package.json                ← npm scripts (test, typecheck)
└─ tsconfig.json               ← TypeScript config
```

### The Data Flow

```
1. User request / feature idea
        ↓
2. features/*.feature   (Gherkin scenario)
        ↓
3. src/pages/*Page.ts   (Page Object - locators & actions)
        ↓
4. src/step-definitions/*.steps.ts (Given/When/Then glue)
        ↓
5. .env values injected at runtime
        ↓
6. npm test → Cucumber executes → Playwright drives browser
```

**Layering Rule:** Feature → Steps → Page Object → Browser.
Each layer only talks to the one directly below it. **Never skip a layer.**

---

## 1. Feature File Authoring Rules

### Golden Rules of Gherkin

1. **One scenario = one behavior.** Split compound scenarios.
2. **Declarative, not imperative.** Say WHAT, not HOW.
3. **Exact error text** when asserting messages.
4. **Tags** for grouping (`@login`, `@smoke`, `@regression`).
5. **Background** only for steps shared by EVERY scenario.

### Standard Template (matches this repo's login.feature)

```gherkin
@login
Feature: Login

  As a user of the application
  I want to be able to log in
  So that I can access my account

  Background:
    Given I am on the login page

  Scenario: Successful login with valid credentials
    When I log in with valid credentials
    Then I should be logged in successfully

  Scenario: Unsuccessful login with invalid credentials
    When I log in with invalid credentials
    Then I should see an error message
```

**Why the scenario names contain context:**
- "Successful login **with valid credentials**" — the *data used* is in the name
- Failure reports become self-explanatory without digging into steps

### Feature File Checklist

- [ ] Starts with a tag relevant to the suite (`@login`)
- [ ] Has `Feature:` with user story (As a / I want / So that)
- [ ] `Background:` holds shared preconditions only
- [ ] Scenario names describe the *behavior + data condition*
- [ ] Steps use business language, zero technical terms
- [ ] Expected error text is quoted exactly as the app shows it
- [ ] No `And` chains longer than 4 steps
- [ ] No scenario mixes happy-path and error-path asserts

---

## 2. Page Object Model (POM) Rules

### What a Page Object Is

A class that **wraps one page/screen**:
- **Locators** → the ONLY place selectors live
- **Action methods** (`login()`) → user-level operations
- **Query methods** (`isLoginSuccessful()`) → state checks

### Class Template (matching LoginPage.ts conventions)

```typescript
import type { Locator, Page } from 'playwright';

/**
 * Page Object for the <PageName> page.
 *
 * A Page Object wraps the locators and actions of ONE page/screen so that
 * step definitions never have to deal with raw Playwright selectors.
 */
export class SomePage {
  private readonly page: Page;

  // ---- Locators ----------------------------------------------------------
  readonly someInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Stable data-testid attributes preferred.
    this.someInput = page.locator('[data-testid="some-input"]');
  }

  /** Opens the page using the BASE_URL from the .env file. */
  async navigateToSomePage(): Promise<void> {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error(
        'BASE_URL is not set. Copy .env.example to .env and fill in your BASE_URL.'
      );
    }
    await this.page.goto(`${baseUrl}/some-path`, { waitUntil: 'domcontentloaded' });
    await this.someInput.waitFor({ state: 'attached', timeout: 15_000 });
    await this.page.waitForTimeout(500);
  }
}
```

### Rules Every Page Object Must Follow

| Rule | Why |
|------|-----|
| Constructor takes only `Page` | World creates the page for us |
| Locators live ONLY here | Step defs never see selectors |
| Actions are `async` | All Playwright calls return promises |
| Timeouts are explicit (15s/30s) | Avoid implicit 5s default flakiness |
| Selectors use `data-testid` | Stable against text/class changes |
| Env vars read at call-time | Tests stay portable |

---

## 3. Locator Strategy (from 15 years)

### Priority Order — always try in this order

```
1. data-testid        [data-testid="login-email-input"]     ★ BEST
2. role + name        page.getByRole('button', { name: 'Sign in' })
3. label              page.getByLabel('Email')
4. placeholder        page.locator('input[placeholder="Email"]')
5. css class/id       page.locator('#email-input')          ★ LAST RESORT
```

### Why `data-testid` Wins

```typescript
// ✗ FRAGILE: breaks when copy changes
page.locator('button:has-text("Sign in")');

// ✗ FRAGILE: breaks when CSS is refactored
page.locator('.btn-primary.submit');

// ✓ STABLE: survives design + copy changes
page.locator('[data-testid="login-submit"]');
```

### Robust Locator Patterns

```typescript
// Exact attribute match (preferred)
page.locator('[data-testid="login-email-input"]');

// Role-based (great for accessibility parity)
page.getByRole('button', { name: /sign in/i });

// Text is LAST RESORT and must be exact
page.getByText('Invalid email or password.', { exact: true });
```

### Locator Checklist

- [ ] Prefer `[data-testid="..."]` when the app provides it
- [ ] Never concatenate dynamic data into a selector
- [ ] Never use `:nth-child` when a stable attribute exists
- [ ] Verify selector matches exactly ONE element during dev

---

## 4. Step Definition Rules

### Template (matching login.steps.ts conventions)

```typescript
import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import { CustomWorld } from '../support/world';

// ---------------------------------------------------------------
// Step definitions ONLY call high-level Page Object methods.
// NO raw Playwright locators or selectors in this file.
// Credentials come from .env - never hardcode them here.
// ---------------------------------------------------------------

Given('I am on the login page', async function (this: CustomWorld) {
  await this.loginPage.navigateToLoginPage();
});

When('I log in with valid credentials', async function (this: CustomWorld) {
  const username = this.env('APP_USERNAME');
  const password = this.env('APP_PASSWORD');
  await this.loginPage.login(username, password);
});

Then('I should see an error message', async function (this: CustomWorld) {
  const expectedError = this.env('EXPECTED_ERROR_TEXT');
  const actualError = await this.loginPage.getLoginErrorMessage();

  expect(actualError).toContain(expectedError);
});
```

### World Helpers Available

```typescript
this.page          // Playwright Page for the scenario
this.context       // BrowserContext
this.browser       // Browser instance
this.env('KEY')    // Reads process.env, throws helpful error if missing
this.loginPage     // Fresh LoginPage object (custom pages follow this pattern)
```

### Adding a New Page Object to the World

**1. Create the Page Object** in `src/pages/`:

```typescript
// src/pages/DashboardPage.ts
export class DashboardPage {
  // ...locators and methods for /dashboard
}
```

**2. Wire it into CustomWorld** (`src/support/world.ts`):

```typescript
import { DashboardPage } from '../pages/DashboardPage';

// inside CustomWorld class:
public get dashboardPage(): DashboardPage {
  return new DashboardPage(this.page);
}
```

**3. Use it in steps**:

```typescript
Then('I should see my account balance', async function (this: CustomWorld) {
  const balance = await this.dashboardPage.getAccountBalance();
  expect(balance).toContain('$');
});
```

### Step Definition Checklist

- [ ] Step text in the definition EXACTLY matches the `.feature` file
- [ ] Uses `this.env()` for ALL credentials — zero hardcoding
- [ ] Calls Page Object methods only — no `page.locator()` inline
- [ ] Assertions use `expect(...)` from `@playwright/test`
- [ ] Async everywhere, typed `this: CustomWorld`
- [ ] Imported page class exists and is wired in world.ts

---

## 5. Anti-Flakiness Code Patterns

Every generated method MUST bake in stability. These are the non-negotiables
learned from real production suites:

### Progressive Wait Pattern

```typescript
// 1. Navigate & wait for DOM
await this.page.goto(url, { waitUntil: 'domcontentloaded' });

// 2. Element exists in DOM (attached)
await locator.waitFor({ state: 'attached', timeout: 15_000 });

// 3. Framework render settle
await this.page.waitForTimeout(500);

// 4. Element interactive (visible)
await locator.waitFor({ state: 'visible', timeout: 15_000 });
```

### Never Use Auto-Retrying Shortcuts Blindly

```typescript
// ✗ BAD: returns immediately if element not there yet
const count = await locator.count();

// ✗ BAD: single snapshot, races with async rendering
const visible = await locator.isVisible();

// ✓ GOOD: waits up to N seconds for the state you expect
await locator.waitFor({ state: 'visible', timeout: 15_000 });
```

### Dual-Signal Success Detection

```typescript
async isSomethingSuccessful(): Promise<boolean> {
  try {
    // Signal 1: the app's own success indicator
    await this.successIndicator.waitFor({ state: 'visible', timeout: 30_000 });

    // Signal 2: confirm the expected URL
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/dashboard')) {
      console.warn(`⚠️  Indicator visible but unexpected URL: ${currentUrl}`);
      return false;
    }
    return true;
  } catch {
    console.error(`❌ Success check failed`);
    return false;
  }
}
```

### Graceful Optional-Element Reads

```typescript
async getMaybeErrorText(): Promise<string> {
  try {
    await this.page.waitForTimeout(500);
    const isVisible = await this.errorMessage.isVisible().catch(() => false);
    if (!isVisible) return '';
    const text = await this.errorMessage.textContent({ timeout: 5_000 });
    return (text ?? '').trim();
  } catch {
    return '';
  }
}
```

---

## 6. Environment Variable Conventions

### Adding a New Credential

**1.** Add to `.env.example` (committed template):

```
# Dashboard check
EXPECTED_DASHBOARD_HEADING=Welcome
```

**2.** Add the real value to local `.env` (git-ignored):

```
EXPECTED_DASHBOARD_HEADING=Welcome back, Casey
```

**3.** Read it in steps via World helper:

```typescript
const expected = this.env('EXPECTED_DASHBOARD_HEADING');
```

### Naming Convention

| Pattern | Example | Used for |
|---------|---------|----------|
| `APP_*` | `APP_USERNAME` | Valid login data |
| `EXPECTED_*` | `EXPECTED_ERROR_TEXT` | Expected outcome strings |
| `BASE_URL` | `BASE_URL` | Environment base URL |

---

## 7. End-to-End Workflow (Scenario Addition)

### Step-by-Step Process

```
1. IDENTIFY   → What behavior? Which page? What data?
2. WRITE      → Feature file scenario in features/*.feature
3. RUN dry    → npm test → see "undefined step" for new steps
4. IMPLEMENT  → Page Object method(s) in src/pages/*Page.ts
5. GLUE       → Step definition(s) in src/step-definitions/*.steps.ts
6. CONFIGURE  → Any new .env vars (.env + .env.example)
7. VERIFY     → npm run typecheck && npm test
8. CONFIRM    → Run npm test 3× — expect 3/3 green
```

### Sample Request → Generated Code

**User request:** *"Test that a user can't log in with an empty password."*

**Feature scenario added:**
```gherkin
Scenario: Unsuccessful login with empty password
  When I attempt to log in with email but no password
  Then I should see an error message
```

**Step definition:**
```typescript
When('I attempt to log in with email but no password', async function (this: CustomWorld) {
  const username = this.env('APP_USERNAME');
  await this.loginPage.login(username, '');
});
```

**Page Object stays untouched** — `login()` already accepts any strings.
Zero new selectors needed. This is the beauty of a well-factored POM.

---

## 8. Common Code Smells to Avoid

### ❌ Steps File Contains Selectors

```typescript
// ✗ WRONG
Then('...', async function (this: CustomWorld) {
  await this.page.locator('[data-testid="login-submit"]').click();
});

// ✓ RIGHT — delegate to the Page Object
Then('...', async function (this: CustomWorld) {
  await this.loginPage.submit();
});
```

### ❌ Hardcoded Credentials

```typescript
// ✗ WRONG
await this.loginPage.login('casey@zinc.test', 'Passw0rd!');

// ✓ RIGHT
const username = this.env('APP_USERNAME');
const password = this.env('APP_PASSWORD');
await this.loginPage.login(username, password);
```

### ❌ Magic Numbers as Timeouts

```typescript
// ✗ WRONG — why 3000? inconsistent with the rest of the suite
await locator.waitFor({ state: 'visible', timeout: 3000 });

// ✓ RIGHT — matches framework convention (15s interaction, 30s success)
await locator.waitFor({ state: 'visible', timeout: 15_000 });
```

### ❌ Steps That Mix Concerns

```typescript
// ✗ WRONG — asserting two unrelated outcomes in one step
Then('I should see the dashboard and a success message', ...);

// ✓ RIGHT — one Then per outcome
Then('I should be redirected to the dashboard', ...);
Then('I should see a welcome message', ...);
```

---

## When to Ask Me (Generator)

✅ **"Write a test for..."** → Feature + steps + page object, complete
✅ **"Find the best locator for..."** → I'll inspect the app/DOM for stable selectors
✅ **"Add a new page object for..."** → Full POM class + World wiring
✅ **"Convert this manual test to automation"** → Gherkin + glue code
✅ **"Which selector should we use here?"** → data-testid first, role second
✅ **"How do I read credentials safely?"** → `this.env()` pattern, always

---

**Last Updated:** September 2026
**Framework:** Playwright + Cucumber + TypeScript
**QA Experience:** 15+ years test automation architecture






