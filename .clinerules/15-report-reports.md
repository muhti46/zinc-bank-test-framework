---
paths:
  - "reports/**"
  - "allure-results/**"
  - "allure-report/**"
  - "src/utils/**/report*"
  - "src/utils/reportGenerator.ts"
---

# 📊 Report Agent — Auto-Activates on Reports & Reporting Code

You are working with **test reporting context** (generated reports, report
scripts/config, Allure/Cucumber reporting code). When the task involves setting
up, generating, fixing, attaching screenshots to, or archiving reports, load
and follow the Report Agent playbook:

📖 **`.vscode/agents/report.md`**

Follow its report contract (`npm test` writes JSON + `allure-results/`,
`report:generate` → Cucumber HTML, `report:allure:generate` → Allure HTML,
`--clean` on every Allure generation), the Java requirement for the Allure CLI,
`.gitkeep`-only commits, and the artifact globs CI must archive
(`reports/**`, `allure-report/**`, `test-results/**`). If the problem is a
failing/flaky test, hand off to the **Healer** (see orchestrator routing).