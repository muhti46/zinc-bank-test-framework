// Local dev driver for `npm run test:reports`:
//   1. runs the full Cucumber suite (`npm test`)
//   2. ALWAYS builds both reports afterwards - even when the suite fails -
//      mirroring the Jenkins `TEST_EXIT` pattern so a red run still ships
//      debuggable evidence
//   3. opens both reports in the default browser (Windows `start` command)
//   4. exits with the suite's exit code; a report-step problem only flips the
//      result to non-zero when the tests themselves passed
//
// CI never calls this script. Jenkins runs `npm test` + `report:generate` +
// `report:allure:generate` as separate pipeline steps, and `report:open*` are
// local-only `start` commands that must never run on a build agent (see the
// 📊 Report agent playbook, `.vscode/agents/report.md`).

import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

// Steps always executed after the suite, in this order. Names map 1:1 to
// scripts in package.json.
const REPORT_STEPS = [
  'report:generate', // reports/cucumber-report.json -> reports/cucumber-report.html
  'report:allure:generate', // allure-results/ -> allure-report/index.html
  'report:open', // open the Cucumber HTML report in the default browser
  'report:open:allure' // open the Allure HTML report in the default browser
] as const;

function run(script: string): number {
  const result = spawnSync('npm', ['run', script], {
    stdio: 'inherit',
    shell: true
  });
  if (result.error) {
    console.error(
      `[test:reports] 'npm run ${script}' failed to start: ${result.error.message}`
    );
    return 1;
  }
  return result.status ?? 0;
}

// 1) Run the suite. Do NOT short-circuit on a red run - see header comment.
const suiteExitCode = run('test');

// 2) Always build both reports and open them in the browser.
let reportStepFailed = false;
for (const step of REPORT_STEPS) {
  if (!isWindows && (step === 'report:open' || step === 'report:open:allure')) {
    // The `report:open*` scripts rely on cmd's `start`; on macOS/Linux the
    // reports were already built, so just point the developer at them.
    console.log(
      `[test:reports] Skipping '${step}' (Windows-only) - open the report manually:`
    );
    console.log('  reports/cucumber-report.html  or  allure-report/index.html');
    continue;
  }
  if (run(step) !== 0) {
    reportStepFailed = true;
    console.error(
      `[test:reports] 'npm run ${step}' failed - see the Report agent playbook.`
    );
  }
}

// 3) The suite's exit code is authoritative. Only when the suite was green but
//    a report step failed do we surface that with a non-zero exit.
process.exit(reportStepFailed && suiteExitCode === 0 ? 1 : suiteExitCode);
