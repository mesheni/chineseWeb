const assert = require('assert');
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, '..', 'data', 'test.sqlite');
process.env.DB_PATH = TEST_DB;
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { sequelize, Dictionary } = require('../server/database');
const app = require('../server/app');

async function seedTestData() {
  await Dictionary.bulkCreate([
    { chinese: '你好', pinyin: 'nǐ hǎo', russian_word: 'Здравствуйте', hsk_level: 1, source: 'hsk', char_length: 2 },
    { chinese: '谢谢', pinyin: 'xiè xiè', russian_word: 'Спасибо', hsk_level: 1, source: 'hsk', char_length: 2 },
    { chinese: '学习', pinyin: 'xué xí', russian_word: 'Учиться', hsk_level: 1, source: 'hsk', char_length: 2 },
    { chinese: '中国', pinyin: 'zhōng guó', russian_word: 'Китай', hsk_level: 1, source: 'hsk', char_length: 2 },
    { chinese: '朋友', pinyin: 'péng yǒu', russian_word: 'Друг', hsk_level: 1, source: 'hsk', char_length: 2 },
  ]);
}

async function cleanup() {
  await sequelize.close();
  for (const f of [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm']) {
    try { fs.unlinkSync(f); } catch (e) { /* ignore */ }
  }
}

let passed = 0;
let failed = 0;

async function run() {
  await sequelize.sync({ force: true });
  await seedTestData();

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  ✔ ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ✘ ${name}: ${err.message}`);
    }
  }

  // ---- 1. Health endpoint ----
  console.log('\n1. Health endpoint');
  await test('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.dictionary_entries > 0);
  });

  // ---- 2. Create list + add word + get words ----
  console.log('\n2. Create list + add word + get words');
  let listId, wordId;

  await test('POST /api/study-lists creates a list', async () => {
    const res = await request(app)
      .post('/api/study-lists')
      .send({ name: 'Test List', description: 'For testing' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.name, 'Test List');
    listId = res.body.id;
  });

  await test('POST /api/study-lists/:id/words adds a word', async () => {
    const res = await request(app)
      .post(`/api/study-lists/${listId}/words`)
      .send({ dictionary_id: 1 });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.word);
    assert.strictEqual(res.body.created, true);
    wordId = res.body.word.id;
  });

  await test('GET /api/study-lists/:id/words returns list words', async () => {
    const res = await request(app).get(`/api/study-lists/${listId}/words`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.list.name, 'Test List');
    assert.ok(res.body.words.length >= 1);
    assert.strictEqual(res.body.words[0].entry.chinese, '你好');
  });

  // ---- 3. Import HSK level ----
  console.log('\n3. Import HSK level');
  let hskListId;

  await test('GET /api/study-lists/hsk/available returns levels', async () => {
    const res = await request(app).get('/api/study-lists/hsk/available');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length > 0);
    assert.strictEqual(res.body[0].level, 1);
  });

  await test('POST /api/study-lists/hsk/import/:level imports HSK level', async () => {
    const res = await request(app).post('/api/study-lists/hsk/import/1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.list);
    assert.strictEqual(res.body.list.name, 'HSK 1');
    assert.strictEqual(res.body.linked, 5);
    hskListId = res.body.list.id;
  });

  await test('imported list has 5 words', async () => {
    const res = await request(app).get(`/api/study-lists/${hskListId}/words`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.words.length, 5);
  });

  // ---- 4. SRS review submission ----
  console.log('\n4. SRS review submission');

  await test('GET /api/study-lists/:id/review returns due words', async () => {
    const res = await request(app).get(`/api/study-lists/${listId}/review`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.due_count >= 1);
  });

  await test('POST /api/study-lists/:id/review submits review quality', async () => {
    const res = await request(app)
      .post(`/api/study-lists/${listId}/review`)
      .send({ word_id: wordId, quality: 4 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.interval, 1);
    assert.strictEqual(res.body.review_count, 1);
    assert.strictEqual(res.body.ease_factor, 2.5);
  });

  // ---- 5. Dictionary search ----
  console.log('\n5. Dictionary search');

  await test('GET /api/dictionary/search?q=你好 returns results', async () => {
    const res = await request(app).get('/api/dictionary/search?q=%E4%BD%A0%E5%A5%BD');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.total > 0);
    assert.strictEqual(res.body.results[0].chinese, '你好');
  });

  await test('GET /api/dictionary/search with limit returns correct count', async () => {
    const res = await request(app).get('/api/dictionary/search?q=' + encodeURIComponent('你好') + '&limit=2');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.results.length <= 2);
  });

  // ---- 6. Validation ----
  console.log('\n6. Validation (400 on bad data)');

  await test('POST /api/study-lists without name returns 400', async () => {
    const res = await request(app).post('/api/study-lists').send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  await test('POST /api/study-lists with 101-char name returns 400', async () => {
    const res = await request(app)
      .post('/api/study-lists')
      .send({ name: 'x'.repeat(101) });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  await test('POST /api/study-lists/:id/words without dict_id returns 400', async () => {
    const res = await request(app)
      .post(`/api/study-lists/${listId}/words`)
      .send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  await test('POST /api/study-lists/:id/words with string dict_id returns 400', async () => {
    const res = await request(app)
      .post(`/api/study-lists/${listId}/words`)
      .send({ dictionary_id: 'abc' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  await test('POST /api/study-lists/:id/review without word_id returns 400', async () => {
    const res = await request(app)
      .post(`/api/study-lists/${listId}/review`)
      .send({ quality: 3 });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  await test('POST /api/study-lists/:id/review with quality 0 returns 400', async () => {
    const res = await request(app)
      .post(`/api/study-lists/${listId}/review`)
      .send({ word_id: wordId, quality: 0 });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  await test('POST /api/study-lists/:id/review with quality 6 returns 400', async () => {
    const res = await request(app)
      .post(`/api/study-lists/${listId}/review`)
      .send({ word_id: wordId, quality: 6 });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  // ---- Summary ----
  const total = passed + failed;
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Tests: ${total} total, ${passed} passed, ${failed} failed`);

  await cleanup();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal:', err);
  cleanup().then(() => process.exit(1));
});
