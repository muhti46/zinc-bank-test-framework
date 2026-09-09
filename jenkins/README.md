# Jenkins CI for this framework

This folder documents how the repository is connected to the local Jenkins
controller at **http://localhost:8080** and how the pipeline works.

## Job: `zincbank-test-framework`

| Setting | Value |
|---------|-------|
| Type | Pipeline (Pipeline-from-SCM) |
| SCM | `https://github.com/muhti46/zinc-bank-test-framework.git` |
| Branch | `*/main` |
| Script path | `Jenkinsfile` (repo root) |
| SCM credential | `Github` (optional for a public repo) |
| Parameter | `TEST_SUITE` = `full` (default) / `smoke` / `regression` |

The job config mirrors the proven `zincbank-e2e` job already on the controller.

## Jenkins prerequisites

1. **Plugins** (already installed): Pipeline (`workflow-aggregator`), Git,
   Credentials, Plain Credentials, NodeJS, Timestamper, Build Discarder,
   **Allure Jenkins Plugin** (`allure-jenkins-plugin`), HTML Publisher.
2. **Global Tools**:
   - NodeJS installation named **`NodeJS`** (Manage Jenkins → Tools → NodeJS
     installations).
   - **Allure commandline** tool named **`allure3`** (Allure 3;
     Manage Jenkins → Tools → Allure commandline → Allure 3, Add
     installation). With the Allure Jenkins Plugin **3.x** the recommended
     installation bundles the Allure runtime inside the plugin (a private
     Node.js runtime is downloaded on first use) — no Java needed for the
     plugin's own report generation. The pipeline publishes the report with
     the native **"Allure Report"** link + trend graph on the build/job page
     via `step([$class: 'AllureReportPublisher', allureVersion: '3', ...])`.
     `allureVersion: '3'` selects the **Allure 3** installation (`allure3`).
     Do **not** set the `commandline` option in 3.x — it selects an *Allure 2*
     tool; leaving it unset (with `allureVersion: '3'`) makes the plugin use
     the Allure 3 installation.
3. **Credentials** — the framework reads env vars whose values must **never be
   committed**. Create these as **Secret text** in Manage Jenkins → Credentials:

   | Credential ID | Maps to env var | Source |
   |---------------|-----------------|--------|
   | `zincbank-app-username` | `APP_USERNAME` | value in your local `.env` |
   | `zincbank-app-password` | `APP_PASSWORD` | value in your local `.env` |
   | `zincbank-app-invalid-username` | `APP_INVALID_USERNAME` | value in your local `.env` |
   | `zincbank-app-invalid-password` | `APP_INVALID_PASSWORD` | value in your local `.env` |
   | `zincbank-app-error-text` | `EXPECTED_ERROR_TEXT` | value in your local `.env` |

> **Java:** the Allure command line (`allure generate`) requires Java. A Jenkins
> controller ships a JRE, so this is usually already satisfied — the pipeline
> verifies it (`java -version`) in the `Setup Node` stage.

## Pipeline stages

`Checkout` → `Setup Node` (also verifies `java` is available) →
`Install Dependencies` (`npm ci`) →
`Install Playwright Browsers` (`npx playwright install chromium`) →
`Typecheck` → `Run Tests & Build Reports` (`npm test` +
`npm run report:generate` + `npm run report:allure:generate`, preserving the
exit code so a failing suite still ships its reports).

Artifacts archived on **every** build (even failures):

- `reports/cucumber-report.html` — human-readable HTML report
- `reports/cucumber-report.json` — machine-readable JSON report
- `allure-report/index.html` — Allure HTML report (raw data in `allure-results/`)
- `test-results/screenshots/*.png` — failure screenshots

## Triggers

- **Manual**: open the job → *Build with Parameters*.
- **Nightly**: `cron('0 8 * * 1-6')` (Mo–Sa, 08:00).
- **On push**: `pollSCM('H/5 * * * *')` — the controller listens on `localhost`,
  so GitHub webhooks cannot reach it; polling is used instead.

## Verification

```powershell
# from this repo - the exact sequence the pipeline runs:
npm ci
npx playwright install chromium
npm run typecheck
npm run test:reports   # runs the tests, then builds Cucumber HTML + Allure HTML
```

If a test flakes only inside Jenkins, that is a **Healer ticket** — do not mask
it by adding `retry` to the pipeline.
