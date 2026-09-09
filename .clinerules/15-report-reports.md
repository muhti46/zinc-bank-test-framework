---
paths:
  - "reports/**"
  - "allure-results/**"
  - "allure-report/**"
  - "src/utils/**/report*"
  - "src/utils/reportGenerator.ts"
  - "src/utils/allureReportServer.ts"
  - "src/utils/openAllureReport.ts"
---

# 📊 Report Agent — Auto-Activates on Reports & Reporting Code

You are working with **test reporting context** (generated reports, report
scripts/config, Allure/Cucumber reporting code). When the task involves setting
up, generating, fixing, attaching screenshots to, or archiving reports, load
and follow the Report Agent playbook:

📖 **`.vscode/agents/report.md`**

Follow its report contract (`npm test` — driver `src/utils/runTestWithReports.ts`
— writes JSON + `allure-results/`, builds both reports and opens them in the
browser **only on a local machine**; `report:generate` → Cucumber HTML,
`report:allure:generate` → Allure HTML, `--clean` on every Allure generation),
the Java requirement for the Allure CLI,
`.gitkeep`-only commits, and the artifact globs CI must archive
(`reports/**`, `allure-report/**`, `test-results/**`). The Allure HTML report
is opened through a tiny local HTTP server (`openAllureReport.ts` +
`allureReportServer.ts`, port 3759) because a raw `file://` open renders blank
(Allure uses `fetch()`). On Jenkins the local-controller desktop auto-open is
owned by the **Jenkins agent** (`zincbank-open-reports` scheduled task). If the
problem is a failing/flaky test, hand off to the **Healer** (see orchestrator
routing).