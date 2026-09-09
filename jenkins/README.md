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
   Credentials, Plain Credentials, NodeJS, Timestamper, Build Discarder.
2. **Global Tool**: NodeJS installation named **`NodeJS`**
   (Manage Jenkins → Tools → NodeJS installations).
3. **Credentials** — the framework reads env vars whose values must **never be
   committed**. Create these as **Secret text** in Manage Jenkins → Credentials:

   | Credential ID | Maps to env var | Source |
   |---------------|-----------------|--------|
   | `zincbank-app-username` | `APP_USERNAME` | value in your local `.env` |
   | `zincbank-app-password` | `APP_PASSWORD` | value in your local `.env` |
   | `zincbank-app-invalid-username` | `APP_INVALID_USERNAME` | value in your local `.env` |
   | `zincbank-app-invalid-password` | `APP_INVALID_PASSWORD` | value in your local `.env` |
   | `zincbank-app-error-text` | `EXPECTED_ERROR_TEXT` | value in your local `.env` |

## Pipeline stages

`Checkout` → `Setup Node` → `Install Dependencies` (`npm ci`) →
`Install Playwright Browsers` (`npx playwright install chromium`) →
`Typecheck` → `Run Cucumber Tests` (`npm test` + `npm run report:generate`,
preserving the exit code).

Artifacts archived on **every** build (even failures):

- `reports/cucumber-report.html` — human-readable HTML report
- `reports/cucumber-report.json` — machine-readable JSON report
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
npm run test:html
```

If a test flakes only inside Jenkins, that is a **Healer ticket** — do not mask
it by adding `retry` to the pipeline.
