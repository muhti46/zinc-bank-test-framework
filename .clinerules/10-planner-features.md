---
paths:
  - "features/**"
  - "**/*.feature"
  - "README.md"
---

# 🎯 Planner Agent — Auto-Activates on Feature Files

You are working with **feature/scenario planning context**. When the task
involves deciding WHAT or WHY to test (strategy, coverage, new scenarios,
scenario quality review), load and follow the Planner playbook:

📖 **`.vscode/agents/planner.md`**

Apply its scenario templates, risk-based prioritization, test-data golden
rule (env vars, never hardcode), and coverage checklist before any code is
written. If the task is actually about *implementing* tests instead, hand off
to the Generator (see orchestrator routing).
