// Local dev driver behind BOTH `npm test` and `npm run test:reports`:
//   1. runs the full Cucumber suite (cucumber-js directly - no recursion)
//   2. ALWAYS builds both reports afterwards - even when the suite fails -
//      mirroring the Jenkins `TEST_EXIT` pattern so a red run still ships
//      debuggable evidence
//   3. opens both reports in the default browser (Windows: the Cucumber file
//      via `start`, the Allure report via a tiny local HTTP server - see
//      `src/utils/openAllureReport.ts`; a raw `file://` Allure open renders
//      blank because Allure loads its data with fetch()) -
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
import { existsSync, readdirSync, rmSync } from 'node:fs';

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

// Extra CLI arguments are forwarded straight to cucumber-js so you can filter
// what runs without losing the report pipeline. Examples:
//   npm run test:us01                      -> ts-node .../runTestWithReports.ts --tags @US01
//   npm test -- --tags "@US01-AC6"         -> runs a single scenario + reports
// ts-node keeps the script path as the first argv entry; driver-specific flags
// (--no-open) are consumed here and never reach cucumber.
const DRIVER_FLAGS = new Set(['--no-open']);

function cucumberArgs(): string[] {
  const args = process.argv.slice(2);
  if (args.length > 0 && !args[0].startsWith('-')) {
    args.shift(); // the script path itself (ts-node)
  }
  const forwarded = args.filter((arg) => !DRIVER_FLAGS.has(arg));
  // --exit forces cucumber-js to terminate once every scenario is done.
  // Playwright's browser stays alive as an open handle and, without it,
  // cucumber-js can exit non-zero AFTER a fully green run (dangling handle).
  if (!forwarded.includes('--exit')) {
    forwarded.push('--exit');
  }
  return forwarded;
}

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

// Remove stale raw results before the suite so each report reflects ONLY the
// scenarios that ran just now. `allure generate --clean` cleans the OUTPUT
// (allure-report/) but NOT the INPUT (allure-results/) - leftover files from
// earlier runs keep showing up in every new report (old/renamed scenarios,
// broken records from previous sessions, etc.). Same for the cucumber JSON.
// Failure screenshots get the same treatment: hooks.ts only creates PNGs for
// FAILED scenarios, but a `test-results/screenshots/` folder that is never
// wiped (gitignored, so `git checkout` on CI leaves it untouched) accumulates
// screenshots from older builds - which Jenkins then archives and attaches to
// the e-mail even when today's run was 100% green.
// IMPORTANT: `.gitkeep` files are repo-governed (the Report agent requires
// .gitkeep-only commits) - purge the folder CONTENTS, never the folder itself.
function cleanRawResults(): void {
  const KEEP = new Set(['.gitkeep']);
  for (const dir of ['allure-results', 'test-results/screenshots']) {
    if (existsSync(dir)) {
      for (const entry of readdirSync(dir)) {
        if (KEEP.has(entry)) continue;
        rmSync(`${dir}/${entry}`, {
          recursive: true,
          force: true
        });
      }
    }
  }
  // Single-file cucumber JSON (gitignored; overwritten every run anyway).
  rmSync('reports/cucumber-report.json', { force: true });
  console.log('[test] Cleared stale raw results (allure-results/, test-results/screenshots/, reports/cucumber-report.json).');
}

// 0) Wipe stale raw results first - otherwise every report mixes in
//    leftovers from earlier runs (see cleanRawResults above).
cleanRawResults();

// 1) The suite. Run cucumber-js directly (NOT via `npm test` - that would
//    recurse into this script). Forward extra CLI args (e.g. `--tags @US01`)
//    so a subset of scenarios can be run through the same report pipeline.
//    Do NOT short-circuit on a red run.
const suiteExitCode = run('cucumber-js', cucumberArgs());

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
  // Most likely a leftover from scripted verification loops (Healer's 10x run
  // etc.) - spell out exactly how to un-stick the browser opening.
  const source = process.argv.includes('--no-open')
    ? '--no-open was passed on the command line'
    : 'TEST_NO_OPEN is set in this terminal session';
  console.log(
    `[test] Reports built but NOT opened (${source}). ` +
      'Unset it with:  Remove-Item Env:TEST_NO_OPEN  (PowerShell)  /  set TEST_NO_OPEN=  (cmd)'
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
