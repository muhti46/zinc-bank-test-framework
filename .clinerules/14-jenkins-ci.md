---
paths:
  - "Jenkinsfile"
  - "**/Jenkinsfile*"
  - "jenkins/**"
  - ".jenkins/**"
---

# 🚀 Jenkins Agent — Auto-Activates on Jenkins / Pipeline Files

You are working with **Jenkins / on-prem CI-CD context** (Jenkinsfile, Jenkins
job configs, the local controller at http://localhost:8080, Jenkins credentials).
When the task involves running the suite on Jenkins, pipelines, jobs, or Jenkins
secrets, load and follow the Jenkins Agent playbook:

📖 **`.vscode/agents/jenkins.md`**

Follow its pipeline contract (`npm ci` → `playwright install chromium` →
`typecheck` → `npm test` → `report:generate` + `report:allure:generate`),
secrets policy (only `credentials('<id>')` references — never hardcode `.env`
values), Windows `bat`/`nodejs` tooling rules, and artifact rules (`reports/**`,
`allure-report/**`, `test-results/**` archived in `post { always }`). A Jenkins
failure whose root cause is a flaky test is a **Healer ticket** — hand off
rather than weakening the pipeline. YAML/Groovy must stay valid; never print or
commit credentials.
