const assert = require('assert');
const http = require('http');

const PORT = process.env.TEST_PORT || 3099;
const BASE = `http://localhost:${PORT}`;

// Override env before app starts
process.env.PORT = String(PORT);
process.env.DB_PATH = './data/test.sqlite';

let passed = 0;
let failed = 0;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'localhost', port: PORT, path, method, headers: {} };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await request('GET', '/api/health');
      if (res.status === 200) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not start');
}

function test(name, fn) {
  return async () => {
    try {
      await fn();
      passed++;
      console.log(`  PASS  ${name}`);
    } catch (err) {
      failed++;
      console.log(`  FAIL  ${name}`);
      console.error(`        ${err.message}`);
    }
  };
}

async function run() {
  console.log('Starting server...');
  require('../server/app');
  await waitForServer();
  console.log('Server ready\n');

  const tests = [
    test('GET /api/health returns ok', async () => {
      const res = await request('GET', '/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.ok(typeof res.body.uptime === 'number');
      assert.ok(typeof res.body.words === 'number');
      assert.ok(typeof res.body.timestamp === 'string');
    }),

    test('GET /api/words returns array', async () => {
      const res = await request('GET', '/api/words');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
    }),

    test('GET /api/random returns word', async () => {
      const res = await request('GET', '/api/random');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.id);
      assert.ok(res.body.character);
      assert.ok(res.body.pinyin);
      assert.ok(res.body.translation);
    }),

    test('POST /api/progress creates progress', async () => {
      const wordsRes = await request('GET', '/api/words');
      const wordId = wordsRes.body[0].id;
      const res = await request('POST', '/api/progress', { word_id: wordId, quality: 4 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.word_id, wordId);
      assert.strictEqual(res.body.review_count, 1);
    }),

    test('GET /api/progress/stats returns stats', async () => {
      const res = await request('GET', '/api/progress/stats');
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.body.total_words === 'number');
      assert.ok(typeof res.body.studied === 'number');
      assert.ok(typeof res.body.due_today === 'number');
    }),

    test('GET /api/progress/export returns array', async () => {
      const res = await request('GET', '/api/progress/export');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
    }),
  ];

  for (const t of tests) {
    await t();
  }

  const total = passed + failed;
  console.log(`\n${total} tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
