// Cucumber configuration file.
// Read by `cucumber-js` when you run `npm test`.
const fs = require('fs');

// Make sure the output folders exist before the test run starts.
['reports', 'test-results/screenshots'].forEach((dir) => {
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
      'json:reports/cucumber-report.json'
    ],
    publish: false
  }
};
