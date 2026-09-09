// Local dev driver behind BOTH `npm test` and `npm run test:reports`:
//   1. runs the full Cucumber suite (cucumber-js directly - no recursion)
//   2. ALWAYS builds both reports afterwards - even when the suite fails -
//      mirroring the Jenkins `TEST_EXIT` pattern so a red run still ships
//      debuggable evidence
//   3. opens both reports in the default browser (Windows `start` command) -
//      but ONLY on a real local machine. CI is detected via environment
//      markers (JENKINS_URL / JENKINS_HOME / BUILD_NUMBER / CI /
//      GITHUB_ACTIONS) and the browser steps are skipped there, so a build
//      agent never tries to open a browser. `npm test -- --no-open` (or
//      TEST_NO_OPEN=1) also disables the browser for scripted loops such as
//      the Healer's 10x stability run.
//   4. exits with the suite's exit code; a report-step problem only flips the
//      result to non-zero when the tests themselves passed
//
// CI note: Jenkins runs this script through its `npm test` pipeline step, so
// report generation happens inside the step too (idempotent with the explicit
// report:generate / report:allure:generate steps in the Jenkinsfile). The
// browser is never opened on the agent - see the env-marker check below.

import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

// Browser opening is local-dev only. Detect any CI/build environment marker:
// Jenkins (agents + built-in controller builds) and GitHub Actions all set at
// least one of these.
const isCI = [
  'CI',
  'GITHUB_ACTIONS',
  'JENKINS_URL',
  'JENKINS_HOME',
  'BUILD_NUMBER',
  'BUILD_TAG'
].some((name) => process.env[name]);

// `npm test -- --no-open` (forwarded by npm/ts-node) or TEST_NO_OPEN=1.
const noOpenFlag =
  process.argv.includes('--no-open') || process.env.TEST_NO_OPEN === '1';

// Report steps always executed after the suite (idempotent; match Jenkinsfile).
const REPORT_STEPS = [
  'report:generate', // reports/cucumber-report.json -> reports/cucumber-report.html
  'report:allure:generate' // allure-results/ -> allure-report/index.html
] as const;

// Browser steps, local only (rely on cmd's `start` command).
const OPEN_STEPS = ['report:open', 'report:open:allure'] as const;

function run(cmd: string, args: string[]): number {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (result.error) {
    console.error(
      `[test] '${cmd} ${args.join(' ')}' failed to start: ${result.error.message}`
    );
    return 1;
  }
  return result.status ?? 0;
}

// 1) The suite. Run cucumber-js directly (NOT via `npm test` - that would
//    recurse into this script). Do NOT short-circuit on a red run.
const suiteExitCode = run('cucumber-js', []);

// 2) Always build both reports.
let reportStepFailed = false;
for (const step of REPORT_STEPS) {
  if (run('npm', ['run', step]) !== 0) {
    reportStepFailed = true;
    console.error(`[test] 'npm run ${step}' failed - see the Report agent playbook.`);
  }
}

// 3) Open the reports in the browser - local dev only.
if (isCI) {
  console.log(
    '[test] CI environment detected - reports were built but NOT opened in a browser.'
  );
} else if (noOpenFlag) {
  console.log(
    '[test] --no-open set - reports built, not opened. Open manually: reports/cucumber-report.html  or  allure-report/index.html'
  );
} else {
  for (const step of OPEN_STEPS) {
    if (!isWindows) {
      // `report:open*` rely on cmd's `start`; on macOS/Linux point the dev at
      // the files instead.
      console.log(
        `[test] Skipping '${step}' (Windows-only) - open manually: reports/cucumber-report.html  or  allure-report/index.html`
      );
      continue;
    }
    if (run('npm', ['run', step]) !== 0) {
      reportStepFailed = true;
      console.error(`[test] 'npm run ${step}' failed - see the Report agent playbook.`);
    }
  }
}

// 4) The suite's exit code is authoritative. Only when the suite was green but
//    a report step failed do we surface that with a non-zero exit.
process.exit(reportStepFailed && suiteExitCode === 0 ? 1 : suiteExitCode);
