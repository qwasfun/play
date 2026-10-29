import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createD1 } from '../tests/helpers/d1.mjs';
import { createHandler } from '../worker/index.js';

// This fixture runs the real handler and SQL in disposable in-memory SQLite.
// Its clock follows accelerated browser play; production rate/timing checks stay in API tests.
export async function startQaServer({ root = resolve('dist') } = {}) {
  const db = createD1();
  let clock = Date.now(),
    origin;
  const handler = createHandler({ now: () => clock, sendEvent: async () => {} });
  const originalRandom = crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues = (values) =>
    values instanceof Uint32Array && values.length === 1
      ? ((values[0] = 42), values)
      : originalRandom(values);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/__api/')) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const bytes = Buffer.concat(chunks),
          path = url.pathname.slice('/__api'.length) + url.search;
        clock += 1000;
        const runId = path.match(/^\/v1\/runs\/([a-f0-9-]+)\/result$/)?.[1];
        if (runId && bytes.length) {
          const value = JSON.parse(bytes),
            run = db.db.prepare('SELECT started_at FROM runs WHERE id=?').get(runId);
          if (run && Number.isFinite(value.elapsed))
            clock = Math.max(clock, run.started_at + value.elapsed * 1000 + 1000);
        }
        const request = new Request('http://127.0.0.1:8787' + path, {
          method: req.method,
          headers: req.headers,
          ...(bytes.length ? { body: bytes } : {}),
        });
        const response = await handler(
          request,
          { DB: db, ENVIRONMENT: 'local', ALLOWED_ORIGINS: origin, REQUEST_CLEANUP: 'false' },
          { waitUntil: () => {} },
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      const file = resolve(
        root,
        '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
      );
      if (!file.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const content = await readFile(file);
      const mime = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.webmanifest': 'application/manifest+json',
      };
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('QA resource unavailable');
    }
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', accept);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin,
    db,
    async route(context) {
      await context.route('http://127.0.0.1:8787/**', async (route) => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: origin + '/__api' + url.pathname + url.search });
        await route.fulfill({ response });
      });
    },
    async close() {
      await new Promise((accept) => server.close(accept));
      db.db.close();
      crypto.getRandomValues = originalRandom;
    },
  };
}
