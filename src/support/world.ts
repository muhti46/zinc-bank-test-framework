import { setDefaultTimeout, setWorldConstructor, World } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page } from 'playwright';

import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

/**
 * Cucumber wraps every step (and hook) with its own timeout.
 * The default is 5 seconds, which is too short for slow pages or
 * first-time navigations, so we raise it to 60 seconds here.
 */
setDefaultTimeout(60_000);

/**
 * The World object is created fresh for EVERY scenario.
 * It is shared between all step definitions of that scenario through `this`,
 * which makes it the perfect place to store the browser, context and page.
 *
 * World also offers small helpers (env()) to keep step definitions clean.
 */
export class CustomWorld extends World {
  public browser!: Browser;
  public context!: BrowserContext;
  public page!: Page;

  /** Shortcut so step definitions can reach the LoginPage object easily. */
  public get loginPage(): LoginPage {
    return new LoginPage(this.page);
  }

  /** Shortcut so step definitions can reach the DashboardPage object easily. */
  public get dashboardPage(): DashboardPage {
    return new DashboardPage(this.page);
  }

  /** Reads an environment variable and throws a helpful error when missing. */
  public env(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(
        `Missing environment variable "${name}". Add it to your .env file (see .env.example).`
      );
    }
    return value;
  }
}

// Tell Cucumber to use our World class instead of the default one.
setWorldConstructor(CustomWorld);

