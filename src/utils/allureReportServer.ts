// Serves the generated Allure HTML report over http://127.0.0.1 so it actually
// renders. Allure 2+ loads its data with fetch(); browsers block fetch() from
// file:// pages, which is why double-clicking allure-report/index.html shows an
// empty "Failed to fetch" report instead of the scenarios (see report.md).
//
// Usage (normally via `npm run report:open:allure`):
//   ts-node src/utils/allureReportServer.ts [rootDir] [port]
//
// Behaviour:
//   - binds to 127.0.0.1 only (never exposed to the network)
//   - reads the report from disk on every request, so a long-lived server shows
//     the newest results after a re-run
//   - self-exits after 20 minutes without a request, so a dev machine never
//     accumulates orphan processes
//   - if the port is already taken it assumes an earlier instance is still
//     running and exits 0 (reuse it)

import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'allure-report');
const port = Number(process.argv[3] ?? process.env.ALLURE_REPORT_PORT ?? 3759);
const IDLE_EXIT_MS = 20 * 60 * 1000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

if (!existsSync(root)) {
  console.error(`[allure-server] Report directory not found: ${root}`);
  console.error('[allure-server] Run the tests first:  npm test');
  process.exit(1);
}

let lastRequest = Date.now();

const server = createServer((req, res: ServerResponse) => {
  lastRequest = Date.now();
  let pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (pathname === '/') {
    pathname = '/index.html';
  }
  const file = normalize(join(root, pathname));
  if (
    !file.startsWith(normalize(root)) ||
    !existsSync(file) ||
    statSync(file).isDirectory()
  ) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  createReadStream(file).pipe(res);
});

server.on('error', (err: Error) => {
  const nodeErr = err as NodeJS.ErrnoException;
  if (nodeErr.code === 'EADDRINUSE') {
    // An earlier (still idle-watching) instance already serves this directory
    // and reads from disk per request, so it already shows the newest run.
    console.log(`[allure-server] Port ${port} already in use - reusing the running server.`);
    process.exit(0);
  }
  console.error('[allure-server]', err);
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[allure-server] Serving ${root}`);
  console.log(`[allure-server] http://127.0.0.1:${port}/index.html`);
});

setInterval(() => {
  if (Date.now() - lastRequest > IDLE_EXIT_MS) {
    console.log('[allure-server] No requests for 20 minutes - exiting.');
    process.exit(0);
  }
}, 60_000);
