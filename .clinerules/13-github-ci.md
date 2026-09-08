---
paths:
  - ".github/**"
  - "**/*.yml"
  - "**/*.yaml"
  - "package.json"
  - "package-lock.json"
  - "cucumber.js"
  - ".gitignore"
  - ".mcp.json"
---

# 🐙 GitHub Agent — Auto-Activates on CI / Workflow Files

You are working with **GitHub / CI-CD context** (workflows, Actions, repository
config, lockfiles). When the task involves running the suite on GitHub,
pipelines, secrets in CI, artifacts, or repository governance, load and follow
the GitHub Agent playbook:

📖 **`.vscode/agents/github.md`**

Follow its CI design rules (`npm ci`, Playwright browser install, `typecheck`
before `npm test`), secrets policy (never committed — only GitHub Secrets mapped
through `env:`), artifact rules, and branch-protection checks. A CI failure is a
**Healer ticket** if the root cause is a flaky test — hand off rather than
silencing the pipeline. YAML must stay valid: spaces, no tabs, no secrets.
