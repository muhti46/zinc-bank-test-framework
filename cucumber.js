// Cucumber configuration file.
// Read by `cucumber-js` when you run `npm test`.
const fs = require('fs');
const os = require('os');

// Make sure the output folders exist before the test run starts.
['reports', 'allure-results', 'test-results/screenshots'].forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

module.exports = {
  default: {
    // Load TypeScript files at run time (no compile step needed).
    requireModule: ['ts-node/register'],
    require: [
      'src/support/**/*.ts',
      'src/hooks/**/*.ts',
      'src/step-definitions/**/*.ts'
    ],
    // Feature files live in the `features` folder (this is also the default).
    paths: ['features/'],
    format: [
      'progress',
      // Allure reporter - writes raw results into allure-results/ during the run.
      'allure-cucumberjs/reporter',
      'json:reports/cucumber-report.json'
    ],
    // Exit promptly once every scenario is done. Playwright's browser stays
    // alive as an open handle and, without this flag, cucumber-js can exit
    // non-zero AFTER a fully green run (seen with the bill-pay scenarios).
    forceExit: true,
    formatOptions: {
      // Allure raw results location (see the Report agent playbook).
      resultsDir: 'allure-results',
      environmentInfo: {
        os_platform: os.platform(),
        os_release: os.release(),
        node_version: process.version
      }
    },
    publish: false
  }
};
