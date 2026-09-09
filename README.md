# Playwright + Cucumber + TypeScript Test Automation Framework

A clean, minimal and reusable **BDD** test automation framework for web
applications, built with:

- [Playwright](https://playwright.dev/) – browser automation
- [Cucumber](https://cucumber.io/) – BDD feature files written in Gherkin
- [TypeScript](https://www.typescriptlang.org/) – all code is written in TypeScript
- **Page Object Model (POM)** – page locators live in dedicated page classes
- **dotenv** – environment variables and credentials are stored outside the code
- **cucumber-html-reporter** – readable HTML reports
- **Allure** – rich interactive HTML reports with step history and failure screenshots

> This version ships with the **ZincBank** demo application
> (https://zincbank.cydeo.io) - a simulated bank built for testing education -
> so you can run the tests immediately. When you are ready to test your own
> application, follow the checklist at the bottom of this README.

---

## 1. Prerequisites

- [Node.js](https://nodejs.org/) **20 or newer**
- npm (installed together with Node.js)
- Internet access for the first run (to download Playwright's Chromium browser)

Check your versions:

```bash
node --version
npm --version
```

---

## 2. Installation

```bash
npm install
```

Install the Chromium browser that Playwright controls:

```bash
npx playwright install chromium
```

---

## 3. Configure the `.env` file

1. Create your own `.env` from the template:

   ```bash
   # macOS / Linux
   cp .env.example .env

   # Windows (PowerShell / cmd)
   copy .env.example .env
   ```

2. Open `.env` and fill in the values for **your** application:

   | Variable               | Purpose                                                      |
   | ---------------------- | ------------------------------------------------------------ |
   | `BASE_URL`             | URL of the login page of your application                    |
   | `USERNAME`             | Valid username (successful login scenario)                   |
   | `PASSWORD`             | Valid password (successful login scenario)                   |
   | `INVALID_USERNAME`     | Username used by the unsuccessful login scenario             |
   | `INVALID_PASSWORD`     | Password used by the unsuccessful login scenario             |
   | `EXPECTED_ERROR_TEXT`  | Error text your app shows after an unsuccessful login        |
   | `HEADLESS`             | `true` = invisible browser, `false` = visible browser window |

   **Never commit the real `.env` file.** It is already listed in
   `.gitignore`, and no credentials are hardcoded anywhere in the code or in
   the feature files.

---

## 4. Run the tests

| Command                           | What it does                                                          |
| --------------------------------- | --------------------------------------------------------------------- |
| `npm test`                        | Runs all scenarios; builds **both** reports and opens them in your browser (local machine only) |
| `npm run test:html`               | Runs the tests AND builds the Cucumber HTML report                    |
| `npm run test:reports`            | Alias of `npm test` (same driver) — kept so scripts/CI docs that reference it keep working |
| `npm run test:us00`               | Runs **only the US00 scenarios** (Customer Login) with the full report pipeline + auto-open |
| `npm run test:us01`               | Runs **only the US01 scenarios** (Customer Dashboard) with the full report pipeline + auto-open |
| `npm run test:us02`               | Runs **only the US02 scenarios** (Customer Profile) with the full report pipeline + auto-open |
| `npm test -- --tags "@US01-AC6"`  | Any `--tags` filter runs through the same driver — single scenario, multiple USs, custom tags + reports |
| `npm run report:generate`         | Builds the Cucumber HTML report from the last JSON report (no test run) |
| `npm run report:allure:generate`  | Builds the Allure HTML report from `allure-results/` (no test run)    |
| `npm run report:all`              | Builds **both** reports from the last test run (no test run)          |
| `npm run report:open`             | Opens the Cucumber HTML report in your browser (Windows)              |
| `npm run report:open:allure`      | Opens the Allure HTML report in your browser via a local HTTP server (Windows) |
| `npm run report:clean`            | Deletes `reports/`, `allure-results/`, `allure-report/` and `test-results/` |

> On macOS / Linux open the report with `open reports/cucumber-report.html`.
> `npm test -- --no-open` runs the suite + builds both reports without opening
> the browser (handy for scripted loops like the Healer's 10× stability run).
>
> **Allure note:** `npm run report:open:allure` serves the report over
> `http://127.0.0.1:3759` (tiny local server in `src/utils/allureReportServer.ts`,
> self-exits after 20 idle minutes). Allure loads its data with `fetch()`, which
> browsers block on `file://` pages — double-clicking `allure-report/index.html`
> directly would show an **empty** report.
>
> **Fresh reports only:** the driver purges stale raw results
> (`allure-results/` contents + `reports/cucumber-report.json`) **before** every
> run, so the Allure/Cucumber HTML reports always reflect exactly the scenarios
> that just ran. (`allure generate --clean` alone only cleans the output folder
> `allure-report/`, not the input `allure-results/` — leftover files from older
> runs would otherwise keep showing up in every new report.)

### Where are the results?

| Artifact                        | Location                           |
| ------------------------------- | ---------------------------------- |
| JSON report (machine readable)  | `reports/cucumber-report.json`     |
| HTML report (human readable)    | `reports/cucumber-report.html`     |
| Allure raw results (per run)    | `allure-results/`                  |
| Allure HTML report              | `allure-report/index.html`         |
| Screenshots of failed scenarios | `test-results/screenshots/*.png`   |

A screenshot is taken automatically **only when a scenario fails** — it is
saved as a PNG under `test-results/screenshots/` **and** attached to the
scenario inside the Allure report.

---

## 5. Folder structure

```
playwright-cucumber-framework/
├── features/
│   └── login.feature              # Gherkin scenarios (Given/When/Then)
│
├── src/
│   ├── pages/
│   │   └── LoginPage.ts           # Page Object: locators + actions
│   ├── step-definitions/
│   │   └── login.steps.ts         # Glue code between Gherkin and Page Objects
│   ├── hooks/
│   │   └── hooks.ts               # Before/After hooks: browser + screenshots
│   ├── support/
│   │   └── world.ts               # Shared World object (page, context, env)
│   └── utils/
│       └── reportGenerator.ts     # Converts the JSON report into HTML
│
├── reports/                       # Cucumber reports (JSON + HTML)
├── allure-results/                # Raw Allure data from each test run
├── allure-report/                 # Generated Allure HTML report
├── test-results/
│   └── screenshots/               # Screenshots of failed scenarios
│
├── .env                           # Local configuration (git-ignored)
├── .env.example                   # Template with placeholder values
├── .gitignore
├── cucumber.js                    # Cucumber configuration
├── package.json
└── tsconfig.json
```

---

## 6. How the framework works

### Feature files (`features/*.feature`)
Plain-text Gherkin files that describe behaviour in business language.
Example:

```gherkin
Scenario: Successful login with valid credentials
  Given I am on the login page
  When I log in with valid credentials
  Then I should be logged in successfully
```

Feature files contain **no code and no credentials**.

### Step definitions (`src/step-definitions/*.steps.ts`)
Each Gherkin step (`Given` / `When` / `Then`) is mapped to a TypeScript
function. Step definitions contain only test logic – they never touch raw
Playwright selectors; they call **Page Object** methods instead.

**💡 Tip — jump from a step to its definition:** put the cursor on any step
line in a `.feature` file and press **F12** (or right-click → **Go to
Definition**). The workspace settings (`.vscode/settings.json`) already wire
the **Cucumber** extension to `features/` and `src/step-definitions/`, so the
navigation works out of the box.

### Page Objects (`src/pages/*.ts`)
Each web page/screen has its own class that owns the **locators** and the
**reusable actions** for that page. This is the Page Object Model (POM):

- If a locator changes, you update it in **one** place only.
- Step definitions stay short and readable.
- The same login method can be reused by many scenarios.

### World (`src/support/world.ts`)
Cucumber creates a new **World** object for every scenario. The hooks store
`browser`, `context` and `page` on the World, and step definitions read them
from `this`.

### Hooks (`src/hooks/hooks.ts`)
Cucumber lifecycle events:

- `Before` – runs before **every** scenario:
  launches Chromium, creates a fresh browser context and a fresh page.
- `After` – runs after **every** scenario:
  saves a screenshot if the scenario failed, then closes the browser.

This guarantees that scenarios never share state (cookies, local storage, ...).

### Reporting (`src/utils/reportGenerator.ts` + Allure)
Two reporting layers run on every test run:

- **Cucumber** — Cucumber writes `reports/cucumber-report.json` during the run
  and `src/utils/reportGenerator.ts` turns it into a styled HTML report via
  `cucumber-html-reporter`.
- **Allure** — the `allure-cucumberjs` reporter (declared in `cucumber.js`)
  writes raw data into `allure-results/` during the run; the Allure CLI then
  builds `allure-report/index.html`. Failure screenshots are attached to the
  Allure report automatically from `src/hooks/hooks.ts`.

`npm test` itself drives the full local flow via
`src/utils/runTestWithReports.ts`: it runs the suite, **always** builds both
reports (even when a test fails — the suite's exit code is preserved) and then
**opens them in your default browser automatically** (Windows; macOS/Linux show
a manual-open hint). The browser is opened only on a real local machine — CI is
detected (`CI` / `GITHUB_ACTIONS` / `JENKINS_URL` / `JENKINS_HOME` /
`BUILD_NUMBER` / `BUILD_TAG`) and the `report:open*` steps are skipped there.
For scripted loops (e.g. the Healer's 10× stability run) use
`npm test -- --no-open` — the reports are still built, just not opened.
`npm run test:reports` is an explicit alias of the same driver. On Jenkins the
pipeline still runs the explicit `report:generate` + `report:allure:generate`
steps afterwards (idempotent) and publishes the Allure report on the build
page. All reporting conventions live in the **📊 Report agent** playbook
(`.vscode/agents/report.md`).

### Adding a new scenario
1. Add the scenario to a `.feature` file using Gherkin.
2. Reuse existing steps, or add new step definitions.
3. If a new page is involved, create a new Page Object in `src/pages/`.

---

## 7. What do I have to replace for your real application?

Everything that is currently ZincBank-specific. Checklist:

- [ ] **`BASE_URL`** in `.env` – the login URL of your real application.
- [ ] **`APP_USERNAME`** / **`APP_PASSWORD`** in `.env` – real valid credentials.
- [ ] **`APP_INVALID_USERNAME`** / **`APP_INVALID_PASSWORD`** in `.env`.
- [ ] **`EXPECTED_ERROR_TEXT`** in `.env` – the error message your application
      shows for a wrong login.
- [ ] **Login page locators** in `src/pages/LoginPage.ts`
      (`usernameInput`, `passwordInput`, `loginButton`, `errorMessage`).
- [ ] **Login success check** in `LoginPage.isLoginSuccessful()` – point it at
      an element or URL that only exists after a successful login.

Demo values currently in the local `.env` (ZincBank credentials):

| Variable                   | Demo value                     |
| -------------------------- | ------------------------------ |
| `BASE_URL`                 | `https://zincbank.cydeo.io/login` |
| `APP_USERNAME`             | `casey@zinc.test`              |
| `APP_PASSWORD`             | `Passw0rd!`                    |
| `EXPECTED_ERROR_TEXT`      | `Invalid email or password.` |

---

## 7.5. Playwright MCP (browser control for AI assistants)

The project ships with **Playwright MCP**, which lets AI assistants (Cline,
VS Code Copilot, Claude Desktop, etc.) control the browser directly. The AI
can navigate pages, click elements, take screenshots, and observe your tests
live.

**Installation is already done:**

```bash
npm install --save-dev @playwright/mcp
```

**MCP configuration** (`.mcp.json` in the workspace root):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "0"
      }
    }
  }
}
```

**Usage:**

1. If you use the **Cline** extension in VS Code, the `.mcp.json` file is
   detected automatically (after adding a new file, the `playwright` server
   appears in the **"Use Tools"** menu; restart VS Code if needed).
2. To test the MCP server from the command line:

   ```bash
   npm run mcp:playwright
   ```

   → MCP starts listening on `stdio` (this step is only for manual testing;
   AI assistants start the server automatically).

**Note:** The framework's own tests (`npm test`) use Playwright directly and
do not need MCP. MCP is only for cases where AI assistants need live access
to the browser.

---

## 8. Troubleshooting

- **`Executable doesn't exist` / browser error** → run
  `npx playwright install chromium`.
- **`Missing environment variable ...`** → your `.env` file is incomplete;
  copy `.env.example` to `.env` and fill it in.
- **Reports don't open after `npm test`** → `npm test` builds both reports and
  opens them automatically, but only on a real local machine (CI and
  `--no-open` skip the browser). If generation failed, check the `[test]`
  error lines, then run `npm run report:generate` +
  `npm run report:allure:generate` manually.
- **TypeScript errors** → run `npm run typecheck` for a full check.
- **"Go to Definition" does nothing in `.feature` files** → install the
  **Cucumber** extension (`cucumberopen.cucumber-official`) and reload the
  window. `.vscode/settings.json` already points it at `features/` and
  `src/step-definitions/`. If you see duplicate suggestions/hovers, disable
  the legacy `alexkrechik.cucumberautocomplete` extension.

---

## 8.1. Anti-Flakiness Measures

This framework is optimized to prevent **flaky tests** (tests that sometimes pass
and sometimes fail). The key strategies are:

### Root Causes We Address

1. **Race Conditions**: Form elements rendered but not yet ready for input
2. **Network Latency**: Page loads but async data isn't ready yet
3. **Rendering Delays**: DOM is ready but JavaScript framework hasn't rendered
4. **Navigation Timing**: Test checks success before redirect completes

### Solutions Implemented

#### 1. **Progressive Waiting Strategy** (in `LoginPage.ts`)

```typescript
// Step 1: Wait for DOM ready
await page.goto(url, { waitUntil: 'domcontentloaded' });

// Step 2: Wait for form element to be attached (exists in DOM)
await usernameInput.waitFor({ state: 'attached', timeout: 15_000 });

// Step 3: Give JS framework time to render
await page.waitForTimeout(500);

// Step 4: Wait for element to be visible
await usernameInput.waitFor({ state: 'visible', timeout: 15_000 });

// Step 5: Focus and slight pause before interaction
await usernameInput.focus();
await page.waitForTimeout(100);
```

This ensures the page progresses through each stability stage before the test
proceeds.

#### 2. **Robust Success Detection** (in `isLoginSuccessful()`)

```typescript
// Wait for the success indicator element to be visible (30 sec timeout)
await successIndicator.waitFor({ state: 'visible', timeout: 30_000 });

// Verify the URL also changed (confirms full navigation)
const currentUrl = page.url();
if (!currentUrl.includes('/dashboard')) {
  return false;
}

return true;
```

This uses **both** element visibility AND URL change as indicators, rather than
relying on just one. This is more reliable than checking only the element or
only the URL.

#### 3. **Error Message Handling** (in `getLoginErrorMessage()`)

```typescript
// Wait for error to appear
await page.waitForTimeout(500);

// Check visibility first (avoid stale element errors)
const isVisible = await errorMessage.isVisible().catch(() => false);
if (!isVisible) {
  return '';
}

// Only get text if element is visible
const message = await errorMessage.textContent({ timeout: 5_000 });
```

#### 4. **Reasonable Timeouts**

- Page navigation: `15_000 ms` (15 seconds)
- Success indicator: `30_000 ms` (30 seconds)
- Element visibility: `15_000 ms` (15 seconds)
- Between actions: `100–500 ms` (for frame settling)

These values balance **reliability** (enough time for slow networks) with
**speed** (tests complete in ~8 seconds).

### Test Stability Results

✅ **10/10 consecutive test runs pass** (100% stability)
✅ **Tests complete in ~8 seconds**
✅ **Works reliably on slow networks**

---

## 9. AI QA Agent Team (Cline)

This repository ships with a built-in **QA agent team** that runs inside
[Cline](https://cline.bot) (VS Code AI assistant). The team uses 15+ years of
enterprise QA experience to plan, generate, stabilize, and ship your tests to
CI.

### The Agents

| Agent | Playbook | Domain |
|-------|----------|--------|
| 🧭 **Orchestrator** | `.vscode/agents/orchestrator.md` | Dispatcher & quality gatekeeper |
| 🎯 **Planner** | `.vscode/agents/planner.md` | Test strategy & coverage planning |
| ⚡ **Generator** | `.vscode/agents/generator.md` | Test code & feature generation |
| 🩺 **Healer** | `.vscode/agents/healer.md` | Flaky test healing & stabilization |
| 📊 **Report** | `.vscode/agents/report.md` | All reports & artifacts (Cucumber HTML/JSON, Allure, screenshots, report scripts & CI artifact publishing) |
| 🐙 **GitHub** | `.vscode/agents/github.md` | CI/CD & GitOps (Actions, secrets, artifacts, repo governance) |
| 🚀 **Jenkins** | `.vscode/agents/jenkins.md` | On-prem CI/CD (Jenkins controller at http://localhost:8080, pipelines, jobs, credentials) |

### How It Runs Automatically

The magic is in `.clinerules/` — Cline's auto-loaded rules directory:

```
.clinerules/
├── 01-orchestrator-routing.md   # Always loaded → dispatches every request
├── 10-planner-features.md       # Auto-activates when working on features/**
├── 11-generator-source.md       # Auto-activates when working on src/** test code
├── 12-healer-results.md         # Auto-activates when inspecting test-results/**
├── 13-github-ci.md              # Auto-activates when working on CI / .github/**
├── 14-jenkins-ci.md             # Auto-activates on Jenkinsfile / jenkins/**
└── 15-report-reports.md         # Auto-activates on reports/**, allure-*/**
```

1. **Every Cline session** loads `01-orchestrator-routing.md` automatically.
2. You describe a task — the **Orchestrator classifies** it (strategy vs.
   writing code vs. fixing a failure).
3. It **loads the matching agent's playbook** from `.vscode/agents/` and
   executes the task as that agent (templates, conventions, verification).
4. Context rules (10/11/12/13/14/15) additionally auto-activate an expert whenever
   you touch the relevant files — no prompt needed.

> **Note:** the agents are **markdown playbooks** consumed by Cline — they are
> not standalone programs. They appear automatically because Cline loads
> `.clinerules/` into every conversation.

### Adding a New Agent

The team is designed to grow. To add a new specialist:

1. Create `.vscode/agents/<name>.md` following the same structure (role header,
   overview, rules/templates, verification protocol, "when to ask me").
2. Add a row to the registry table in `.vscode/agents/orchestrator.md`.
3. Add a routing row + a `paths:`-scoped rule in `.clinerules/` (copy
   `10-planner-features.md` as a template) if the agent maps to specific files.

No other wiring is required — the Orchestrator picks it up next session.

### Useful VS Code Tasks

`.vscode/tasks.json` provides one-click commands (Terminal → Run Task):

| Task | Purpose |
|------|---------|
| `test` | Run the full suite; builds + opens both reports in the browser (local only) |
| `test:html (with report)` | Run tests + generate the Cucumber HTML report |
| `test:reports (cucumber + allure)` | Alias of `npm test` — run tests, build + open both reports |
| `typecheck` | TypeScript compile check |
| `stability: 10x flakiness proof` | Healer's 10-run stability loop (`npm test -- --no-open` — no browser tabs) |
| `clean reports` | Remove `reports/`, `allure-results/`, `allure-report/` and `test-results/` |

---

## 10. Jenkins CI

The suite can also run on the **local Jenkins controller** (`http://localhost:8080`).
The repository is wired as a **Pipeline-from-SCM** job (`zincbank-test-framework`)
that reads the `Jenkinsfile` in the repo root.

- **Pipeline stages:** `npm ci` → `npx playwright install chromium` →
  `npm run typecheck` → `npm test` (+ `npm run report:generate` +
  `npm run report:allure:generate`).
- **Artifacts archived on every build:** `reports/cucumber-report.html`,
  `reports/cucumber-report.json`, `allure-report/index.html`,
  `test-results/screenshots/*.png`.
- **Triggers:** manual *Build with Parameters*, weekday smoke `Mon–Fri 08:00`,
  weekday regression `Mon–Fri 17:00`, and SCM polling (webhooks cannot reach a
  `localhost` controller).
- **Secrets:** the framework's env values are stored as Jenkins credentials and
  referenced by ID — they are never committed.
- **Reports auto-open on your desktop:** after **every** completed build
  (manual, nightly cron or SCM-poll) the Cucumber HTML report and that build's
  Allure report open automatically in your default browser. The pipeline
  triggers the interactive scheduled task `zincbank-open-reports` (Jenkins runs
  as a session-0 service, so a plain `start` would be invisible) — see
  [`jenkins/README.md`](jenkins/README.md).

Full runbook (Jenkins prerequisites, credential IDs, job settings, local
verification): see **[`jenkins/README.md`](jenkins/README.md)**.

---




