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

> **Suite → command mapping** (see the `Run Tests & Build Reports` stage):
> `full` → `npm test` (all scenarios); `smoke` → `npm run test:smoke` (the
> `@smoke`-tagged scenarios); `regression` → `npm run test:regression` (the
> `@regression`-tagged scenarios).

## Jenkins prerequisites

1. **Plugins** (already installed): Pipeline (`workflow-aggregator`), Git,
   Credentials, Plain Credentials, NodeJS, Timestamper, Build Discarder,
   **Allure Jenkins Plugin** (`allure-jenkins-plugin`), HTML Publisher.
   For the daily e-mail you additionally need the **Email Extension**
   (`email-ext`) plugin — Manage Jenkins → Plugins → Available → search
   *Email Extension* → Install. (If you skip it, the pipeline falls back to the
   bundled `mail` step, but without the HTML body / Cucumber report attachment.)
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
     via `step([$class: 'AllureReportPublisher', commandline: 'allure', ...])`.
     `commandline: 'allure'` selects the **Allure commandline** tool (with the
     Recommended Allure 3 installer — the plugin bundles the Allure runtime
     and caches a private Node.js runtime; no global install / PATH entry
     needed). Do **not** use `allureVersion: '3'` or the "Allure 3" tool —
     that is the legacy PATH-based variant (requires `allure` in PATH).
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
`Typecheck` → `Run Tests & Build Reports`. That stage picks the command from the
build cause / parameter: the **scheduled weekday builds always run their fixed
suite** — 08:00 → `smoke` (`npm run test:smoke`, the `@smoke`-tagged scenarios)
and 17:00 → `regression` (`npm run test:regression`, the `@regression`-tagged
scenarios) — while manual and SCM-poll builds run the chosen `TEST_SUITE`
(`full` = `npm test`, `smoke` = `npm run test:smoke`, `regression` =
`npm run test:regression`). The driver `src/utils/runTestWithReports.ts`
runs the suite and also builds both reports on the agent; the explicit
`npm run report:generate` + `npm run report:allure:generate` steps after it are
idempotent. The exit code is preserved so a failing suite still ships its
reports).

After the stages finish, `post { always }` archives everything and — on this
local controller — triggers the interactive scheduled task
`zincbank-open-reports`, which opens the fresh Cucumber + Allure reports on the
logged-in desktop (see "Reports auto-open on the desktop" below).

Artifacts archived on **every** build (even failures):

- `reports/cucumber-report.html` — human-readable HTML report
- `reports/cucumber-report.json` — machine-readable JSON report
- `allure-report/index.html` — Allure HTML report (raw data in `allure-results/`)
- `test-results/screenshots/*.png` — failure screenshots

In addition, the **Allure Jenkins Plugin** publishes a native **"Allure
Report"** link on the build and job pages (`/job/zincbank-test-framework`
→ *Allure Report* → last build), with a trend graph across builds. It uses the
`allure` tool (Recommended Allure 3 managed runtime) and does not touch the
workspace `allure-report/` produced by `npm run report:allure:generate`
(which is still archived as an ordinary artifact).

## Triggers

- **Manual**: open the job → *Build with Parameters* (pick `full`/`smoke`/`regression`).
- **Weekday smoke**: `cron('0 8 * * 1-5')` — **Mon–Fri at 08:00** — runs the
  `@smoke` suite and e-mails the report (see next section).
- **Weekday regression**: `cron('0 17 * * 1-5')` — **Mon–Fri at 17:00** — runs
  the `@regression` suite and e-mails the report (see next section).
- **On push**: `pollSCM('H/5 * * * *')` — the controller listens on `localhost`,
  so GitHub webhooks cannot reach it; polling is used instead. Push builds run
  the full suite.

## Daily report e-mail (Mon–Fri 08:00 smoke + 17:00 regression)

The scheduled weekday builds — 08:00 **smoke** and 17:00 **regression** — each
send, at the end of `post { always }`, **one e-mail per scheduled build**
(manual / push builds do not send e-mail, to avoid inbox spam). The e-mail goes
to the Jenkins **default recipients** — no address is hardcoded in the
pipeline.

One-time setup:

1. Install the **Email Extension** plugin (see prerequisites).
2. **Manage Jenkins → Configure System → Extended E-mail Notification**:
   set the SMTP server, credentials (if needed), and put your address (e.g.
   `muhterem@...`) in **Default Recipients**. Also configure the plain
   **E-mail Notification** section with the same SMTP server (fallback path).
3. Click **Test configuration** / send a test mail until it succeeds.

What arrives:

- Subject: `[Jenkins] Smoke report <job> #<build> - SUCCESS|FAILURE` (08:00)
  or `[Jenkins] Regression report <job> #<build> - SUCCESS|FAILURE` (17:00).
- HTML body with the build URL, the result, and links to the archived Cucumber
  HTML and the native Allure report.
- Attachments: the self-contained `reports/cucumber-report.html` + failure
  screenshots (`test-results/screenshots/*.png`) + the console log.
- Sent on success **and** failure (a red run still reports itself).

To change who receives it, edit **Default Recipients** (global) — no pipeline
change needed. To switch the daily runs to different times/days, change the
`cron('0 8 * * 1-5')` / `cron('0 17 * * 1-5')` lines in the `Jenkinsfile`
(Jenkins cron: minutes hours day-of-month month day-of-week; `1-5` = Mon–Fri).

> The smoke suite is defined by the `@smoke` Cucumber tag — currently the three
> critical-path scenarios (login with valid credentials, dashboard redirect,
> dashboard navigation). The regression suite is defined by the `@regression`
> tag — every non-smoke login/dashboard scenario plus the nine US002 Customer
> Profile scenarios (display, editability, save/persist, change-password
> section, masking, length validation, successful change, wrong-current-password
> and the success message). Add/remove either tag to
> change what the daily runs cover; `npm run test:smoke` / `npm run
> test:regression` on your machine reproduce them.

## Reports auto-open on the desktop

The controller runs as a **Windows service (`LocalSystem`, session 0)**, so a
`start` from the pipeline would open a browser nobody can see. Instead, at the
end of `post { always }` the pipeline runs a best-effort step that:

1. writes `open-reports-request.json` into the job workspace (absolute Cucumber
   HTML path + this build's Allure-plugin URL),
2. runs `schtasks /run /tn "zincbank-open-reports"`.

That scheduled task is registered in **your interactive session**, so Task
Scheduler launches it on your desktop. It executes
`jenkins/open-reports-on-desktop.ps1`, which opens the Cucumber HTML file and
the Allure report URL of that build. Allure is opened through the Jenkins
plugin URL (served over HTTP) rather than the local file, because an Allure
report opened as a `file://` page renders blank (browsers block its `fetch()`
data calls).

This happens after **every** completed build — manual *Build with Parameters*,
nightly cron and SCM-poll builds alike. It is best-effort only: if the task is
missing or nobody is logged on, the build stays green and the `schtasks` error
is printed in the console.

### One-time setup (run once from your normal, logged-in user)

```powershell
$helper = 'C:\Users\muhte\.jenkins\workspace\zincbank-test-framework\jenkins\open-reports-on-desktop.ps1'
$action    = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$helper`""
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'zincbank-open-reports' -Action $action -Principal $principal -Settings $settings -Description 'Opens Cucumber + Allure reports on the desktop after a Jenkins build.' -Force
```

Verify: open the job → *Build with Parameters* → when the build finishes, both
reports pop up on your desktop. Every run appends a line to
`open-reports-desktop.log` in the job workspace.

Notes:

- Disable it any time with
  `Unregister-ScheduledTask -TaskName 'zincbank-open-reports' -Confirm:$false`
  (builds stay green).
- If the job workspace path ever changes, re-run the setup with the new
  `$helper` path.

## Verification

```powershell
# from this repo - the exact sequence the pipeline runs:
npm ci
npx playwright install chromium
npm run typecheck
npm test               # runs the tests, builds BOTH reports and opens them in
                       # the browser (local machine only - on the Jenkins agent
                       # the browser step is auto-skipped via CI env markers;
                       # npm run test:reports is an alias of npm test)
```

If a test flakes only inside Jenkins, that is a **Healer ticket** — do not mask
it by adding `retry` to the pipeline.
