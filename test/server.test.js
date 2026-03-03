const test = require('node:test');
const assert = require('node:assert/strict');

const { app } = require('../index.js');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });

  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

test.after(() => {
  if (server) server.close();
});

test('GET / serves index.html', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);

  const text = await res.text();
  assert.match(text, /<title>換裝遊戲<\/title>/);
  assert.match(text, /id="modelStage"/);
});

test('GET /api/wardrobe returns JSON', async () => {
  const res = await fetch(`${baseUrl}/api/wardrobe`);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.ok(json);
  assert.ok(json.baseModel);
  assert.ok(Array.isArray(json.items));
});

test('SPA fallback serves index.html for deep links', async () => {
  const res = await fetch(`${baseUrl}/some/deep/link`);
  assert.equal(res.status, 200);

  const text = await res.text();
  assert.match(text, /<title>換裝遊戲<\/title>/);
});
