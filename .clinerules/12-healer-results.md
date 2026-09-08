---
paths:
  - "test-results/**"
  - "reports/**"
  - "src/hooks/**"
---

# 🩺 Healer Agent — Auto-Activates on Results/Artifacts

You are working with **test results / failure artifacts context** (screenshots,
report JSON, hook output). When the task involves a FAILING or FLAKY test,
timeouts, or stabilization, load and follow the Healer playbook:

📖 **`.vscode/agents/healer.md`**

Adopt the reproduce → classify → fix → prove protocol. Use the screenshot
forensics table from `hooks.ts`, the healing decision tree, and the **10×
consecutive-run PowerShell verification loop** before declaring a flakiness
fix proven. Never weaken or delete assertions to force green.
