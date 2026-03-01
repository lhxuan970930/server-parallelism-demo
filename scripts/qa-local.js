const http = require('http');
const path = require('path');
const fs = require('fs/promises');
const { spawn } = require('child_process');

const PORT = Number(process.env.QA_PORT || 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: pathname,
        method: 'GET',
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForServer({ timeoutMs = 5000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await request('/api/wardrobe');
      if (res.status) return;
    } catch {
      // ignore
    }
    await sleep(150);
  }

  throw new Error(`Server did not start within ${timeoutMs}ms on ${BASE_URL}`);
}

async function findFirstPngUnderAssets() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  async function walk(dir, depth) {
    if (depth > 8) return null;

    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const abs = path.join(dir, e.name);

      if (e.isFile() && e.name.toLowerCase().endsWith('.png')) {
        return abs;
      }

      if (e.isDirectory()) {
        const found = await walk(abs, depth + 1);
        if (found) return found;
      }
    }

    return null;
  }

  return walk(assetsDir, 0);
}

function formatHeaderValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  return String(value || '');
}

function looksLikeHtml(buf) {
  const s = buf.toString('utf8', 0, Math.min(buf.length, 256)).toLowerCase();
  return s.includes('<!doctype html') || s.includes('<html');
}

async function main() {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logs = [];
  child.stdout.on('data', (d) => logs.push({ stream: 'stdout', text: String(d) }));
  child.stderr.on('data', (d) => logs.push({ stream: 'stderr', text: String(d) }));

  try {
    await waitForServer();

    const report = [];

    // 1) / should include critical assets (avoid breaking index.html)
    {
      const res = await request('/');
      const body = res.body.toString('utf8');
      const hasApp = body.includes('<script src="app.js"');
      const hasCss = body.includes('<link rel="stylesheet" href="styles.css"');

      report.push({
        name: 'GET / includes <script src="app.js"> and <link rel="stylesheet" href="styles.css">',
        ok: res.status === 200 && looksLikeHtml(res.body) && hasApp && hasCss,
        detail: {
          status: res.status,
          hasApp,
          hasCss,
          bodyPreview: body.slice(0, 200),
        },
      });
    }

    // 2) /api/wardrobe
    {
      const res = await request('/api/wardrobe');
      const ct = formatHeaderValue(res.headers['content-type']);
      let parsed = null;
      let parseOk = false;
      try {
        parsed = JSON.parse(res.body.toString('utf8'));
        parseOk = true;
      } catch {
        parseOk = false;
      }

      report.push({
        name: 'GET /api/wardrobe returns JSON',
        ok: res.status === 200 && ct.includes('application/json') && parseOk,
        detail: {
          status: res.status,
          contentType: ct,
          bodyPreview: res.body.toString('utf8', 0, 200),
        },
      });

      if (parseOk) {
        report.push({
          name: 'Response shape includes baseModel/items',
          ok: !!parsed && typeof parsed === 'object' && !!parsed.baseModel && Array.isArray(parsed.items),
          detail: {
            baseModel: parsed && parsed.baseModel,
            itemsCount: parsed && Array.isArray(parsed.items) ? parsed.items.length : null,
          },
        });
      }
    }

    // 3) /wardrobe.json (optional static fallback for static deployments)
    {
      const res = await request('/wardrobe.json');
      if (res.status === 404) {
        report.push({
          name: '[SKIP/INFO] GET /wardrobe.json (optional static wardrobe fallback)',
          ok: true,
          detail: 'Not found (404). You can add public/wardrobe.json to serve it as a static fallback.',
        });
      } else {
        const ct = formatHeaderValue(res.headers['content-type']);
        let parsed = null;
        let parseOk = false;
        try {
          parsed = JSON.parse(res.body.toString('utf8'));
          parseOk = true;
        } catch {
          parseOk = false;
        }

        report.push({
          name: 'GET /wardrobe.json returns JSON with baseModel/items (static fallback)',
          ok: res.status === 200 && parseOk && !!parsed && typeof parsed === 'object' && !!parsed.baseModel && Array.isArray(parsed.items),
          detail: {
            status: res.status,
            contentType: ct,
            bodyPreview: res.body.toString('utf8', 0, 200),
            baseModel: parsed && parsed.baseModel,
            itemsCount: parsed && Array.isArray(parsed.items) ? parsed.items.length : null,
          },
        });
      }
    }

    // 4) /assets fetch sample PNG (if any)
    {
      const abs = await findFirstPngUnderAssets();
      if (!abs) {
        report.push({
          name: 'GET /assets/<sample>.png (repo contains a PNG)',
          ok: true,
          detail: 'No PNG files found under ./assets; skipping sample PNG fetch.',
        });
      } else {
        const rel = path.relative(path.join(__dirname, '..', 'assets'), abs);
        const urlPath = `/assets/${rel.split(/[\\/]/).map(encodeURIComponent).join('/')}`;
        const res = await request(urlPath);
        const ct = formatHeaderValue(res.headers['content-type']);

        report.push({
          name: `GET ${urlPath} serves image/png`,
          ok: res.status === 200 && ct.includes('image/png') && res.body.length > 0,
          detail: {
            abs,
            status: res.status,
            contentType: ct,
            bytes: res.body.length,
          },
        });
      }
    }

    // 5) SPA fallback should not intercept /api
    {
      const res = await request('/api/__qa_missing');
      report.push({
        name: 'GET /api/__qa_missing is not SPA HTML',
        ok: res.status === 404 && !looksLikeHtml(res.body),
        detail: { status: res.status, bodyPreview: res.body.toString('utf8', 0, 120) },
      });
    }

    // 6) SPA fallback should not intercept /assets
    {
      const res = await request('/assets/__qa_missing.png');
      report.push({
        name: 'GET /assets/__qa_missing.png is not SPA HTML',
        ok: res.status === 404 && !looksLikeHtml(res.body),
        detail: { status: res.status, bodyPreview: res.body.toString('utf8', 0, 120) },
      });
    }

    // 7) SPA fallback should serve index.html for unknown routes
    {
      const res = await request('/some/deep/link');
      const body = res.body.toString('utf8');
      report.push({
        name: 'GET /some/deep/link returns index.html (SPA fallback)',
        ok: res.status === 200 && looksLikeHtml(res.body) && body.includes('<title>換裝遊戲</title>'),
        detail: { status: res.status },
      });
    }

    const passed = report.every((r) => r.ok);

    const mdLines = [];
    mdLines.push(`# Local QA Report`);
    mdLines.push('');
    mdLines.push(`- Base URL: ${BASE_URL}`);
    mdLines.push(`- Timestamp: ${new Date().toISOString()}`);
    mdLines.push('');

    for (const r of report) {
      mdLines.push(`- ${r.ok ? '[PASS]' : '[FAIL]'} ${r.name}`);
      if (r.detail) {
        mdLines.push('  - detail: ' + (typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail)));
      }
    }

    mdLines.push('');
    mdLines.push('## Server logs (first ~2KB)');
    mdLines.push('```');
    const joined = logs.map((l) => `[${l.stream}] ${l.text}`).join('');
    mdLines.push(joined.slice(0, 2048));
    mdLines.push('```');
    mdLines.push('');

    await fs.writeFile(path.join(__dirname, '..', 'QA_RESULTS.md'), mdLines.join('\n'), 'utf8');

    if (!passed) {
      process.exitCode = 1;
    }
  } finally {
    child.kill('SIGTERM');
  }
}

main();
