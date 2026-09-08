import 'dotenv/config';

import * as fs from 'fs';
import * as path from 'path';

// cucumber-html-reporter does not ship TypeScript types yet,
// so we type the require() result manually.
const reporter = require('cucumber-html-reporter') as {
  generate: (options: Record<string, unknown>) => void;
};

const REPORTS_DIR = path.join(process.cwd(), 'reports');
const JSON_FILE = path.join(REPORTS_DIR, 'cucumber-report.json');
const HTML_FILE = path.join(REPORTS_DIR, 'cucumber-report.html');

// The JSON report is produced by Cucumber during the test run.
if (!fs.existsSync(JSON_FILE)) {
  console.error(`Cucumber JSON report not found at "${JSON_FILE}".`);
  console.error('Run the tests first:  npm test');
  process.exit(1);
}

fs.mkdirSync(REPORTS_DIR, { recursive: true });

const options: Record<string, unknown> = {
  theme: 'bootstrap',
  jsonFile: JSON_FILE,
  output: HTML_FILE,
  reportSuiteAsScenarios: true,
  scenarioTimestamp: true,
  launchReport: false,
  metadata: {
    'Application URL': process.env.BASE_URL ?? 'not set in .env',
    'Test Environment': process.env.ENVIRONMENT ?? 'local',
    Browser: 'Chromium',
    Platform: process.platform,
    Executed: new Date().toISOString()
  }
};

reporter.generate(options);

console.log(`Cucumber JSON report: ${JSON_FILE}`);
console.log(`HTML report generated: ${HTML_FILE}`);
