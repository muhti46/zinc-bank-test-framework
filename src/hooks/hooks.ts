import 'dotenv/config';

import * as fs from 'fs';
import * as path from 'path';

import { After, Before } from '@cucumber/cucumber';
import { attachmentPath, ContentType } from 'allure-js-commons';
import { chromium } from 'playwright';

import { CustomWorld } from '../support/world';

// Screenshots of failed scenarios are saved here.
const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'screenshots');

// Run headless by default. Set HEADLESS=false in .env to see the browser.
const HEADLESS = process.env.HEADLESS !== 'false';

/**
 * Before EVERY scenario: start a fresh browser, context and page.
 * Because the World object is also created per scenario, we can simply
 * attach the browser artifacts to `this` and use them in the steps.
 */
Before(async function (this: CustomWorld) {
  this.browser = await chromium.launch({ headless: HEADLESS });
  this.context = await this.browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  this.page = await this.context.newPage();
});

/**
 * After EVERY scenario:
 *  1. if the scenario failed, save a screenshot;
 *  2. always close the browser.
 *
 * The scenario argument is provided by Cucumber and contains the result.
 */
After(async function (
  this: CustomWorld,
  scenario: { result?: { status?: string }; pickle?: { name?: string } }
) {
  try {
    const failed = scenario?.result?.status === 'FAILED';

    if (failed && this.page) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

      const scenarioName =
        scenario?.pickle?.name?.replace(/[^a-z0-9]+/gi, '_') ?? 'scenario';
      const screenshotPath = path.join(
        SCREENSHOT_DIR,
        `${Date.now()}_${scenarioName}.png`
      );

      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);

      // Attach the same screenshot to the Allure report so every failure also
      // carries visual evidence inside allure-report/.
      // Wrapped in its own try/catch: an Allure problem must never mask the
      // real test result.
      try {
        await attachmentPath('Failure screenshot', screenshotPath, {
          contentType: ContentType.PNG,
          fileExtension: 'png'
        });
      } catch (allureError) {
        console.error(
          `Could not attach screenshot to Allure: ${(allureError as Error).message}`
        );
      }
    }
  } finally {
    // Always close the browser, even when taking the screenshot failed.
    await this.context?.close();
    await this.browser?.close();
  }
});
