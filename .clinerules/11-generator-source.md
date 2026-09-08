---
paths:
  - "features/**"
  - "**/*.feature"
  - "src/pages/**"
  - "src/step-definitions/**"
  - "src/support/**"
  - "src/hooks/**"
---

# ⚡ Generator Agent — Auto-Activates on Test Source Files

You are working with **test implementation context** (feature files, Page
Objects, step definitions, world, hooks). When the task involves WRITING or
REFACTORING test code, load and follow the Generator playbook:

📖 **`.vscode/agents/generator.md`**

Follow its POM conventions, locator priority (`data-testid` first), step
definition templates matching `login.steps.ts`, World wiring, anti-flakiness
code patterns, and env-var conventions. Every line must compile and pass
`npm run typecheck`.
