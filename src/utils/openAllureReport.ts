// Local-dev helper behind `npm run report:open:allure`.
//
// Allure 2+ reports must be served over HTTP to render (browsers block fetch()
// on file:// pages, so the report looks empty when opened as a file). This
// script therefore:
//   1. spawns the tiny static server (allureReportServer.ts) as a DETACHED
//      child so the `npm test` driver is not blocked by it,
//   2. waits until http://127.0.0.1:<port> answers,
//   3. opens the report in the default browser (Windows `start`).
//
// A second run reuses the first run's still-idle server (same fixed port); that
// server reads the report from disk on every request, so it always shows the
// newest results. The server self-exits after 20 minutes idle. On macOS/Linux
// we only print the URL (the `report:open*` scripts are Windows-oriented).

import { spawn, spawnSync } from 'node:child_process';
import { get } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.ALLURE_REPORT_PORT ?? 3759);
const REPORT_DIR = resolve('allure-report');
const INDEX_FILE = resolve(REPORT_DIR, 'index.html');
const URL = `http://127.0.0.1:${PORT}/index.html`;

if (!existsSync(INDEX_FILE)) {
  console.error(`[open-allure] Report not found at "${INDEX_FILE}".`);
  console.error('[open-allure] Run the tests first:  npm test');
  process.exit(1);
}

// 1) Start the static server as a detached child so it outlives this script and
//    keeps serving while the user reads the report.
const tsNodeBin = require.resolve('ts-node/dist/bin.js');
const serverEntry = resolve(__dirname, 'allureReportServer.ts');
const child = spawn(
  process.execPath,
  [tsNodeBin, serverEntry, REPORT_DIR, String(PORT)],
  { detached: true, stdio: 'ignore', windowsHide: true }
);
child.unref();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function serverIsUp(): Promise<boolean> {
  return new Promise((resolveUp) => {
    const req = get(URL, (res) => {
      res.resume();
      resolveUp(res.statusCode === 200);
    });
    req.on('error', () => resolveUp(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolveUp(false);
    });
  });
}

(async () => {
  // 2) Wait until the server answers (or an earlier instance already does).
  const startedAt = Date.now();
  let up = false;
  while (Date.now() - startedAt < 15_000 && !up) {
    up = await serverIsUp();
    if (!up) {
      await wait(250);
    }
  }

  // 3) Open the report in the default browser.
  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', 'start', '', URL], { stdio: 'inherit' });
    console.log(`[open-allure] Opened ${URL} in the default browser.`);
    if (!up) {
      console.log('[open-allure] The server had not answered yet - if the page shows an error, reload it in a second.');
    }
  } else {
    console.log(`[open-allure] Open manually: ${URL}`);
    console.log(`[open-allure] (The static file ${INDEX_FILE} usually renders blank because fetch() is blocked on file://.)`);
  }
})();
