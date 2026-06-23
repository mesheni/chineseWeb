/**
 * Seed script — загружает BKRS словарь в SQLite.
 * Разворачивает bkrs_complete.json в таблицу dictionary.
 * Каждая запись с chinese текстом → одна строка на каждый russian_word.
 */
const fs = require('fs');
const path = require('path');
const { sequelize, Dictionary } = require('./database');

const BATCH_SIZE = 500;

async function seedBKRS() {
  const jsonPath = path.join(__dirname, '..', 'data', 'bkrs_complete.json');
  
  console.log('📖 Loading BKRS data from:', jsonPath);
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);
  
  console.log(`📦 Total entries in JSON: ${data.length}`);
  
  // Check if already seeded
  const count = await Dictionary.count();
  if (count > 0) {
    console.log(`✅ Dictionary already seeded (${count} entries), skipping`);
    return count;
  }
  
  // Flatten: one chinese text may have multiple russian_word entries
  let rows = [];
  for (const item of data) {
    const chinese = item.chinese;
    const charLen = item.length || chinese.length;
    
    for (const rec of item.records) {
      rows.push({
        chinese: chinese,
        russian_word: rec.russian,
        definition: rec.definition,
        source: 'bkrs',
        char_length: charLen
      });
    }
  }
  
  // Deduplicate (same chinese + russian_word)
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = `${row.chinese}|${row.russian_word}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }
  
  console.log(`📊 Unique entries to insert: ${unique.length}`);
  
  // Batch insert
  let inserted = 0;
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    await Dictionary.bulkCreate(batch, { ignoreDuplicates: true });
    inserted += batch.length;
    if (inserted % 10000 === 0 || inserted === unique.length) {
      console.log(`  Progress: ${inserted}/${unique.length}`);
    }
  }
  
  console.log(`✅ Seeded ${inserted} entries into dictionary`);
  return inserted;
}

// Run if called directly
if (require.main === module) {
  seedBKRS().then(count => {
    console.log(`Done: ${count}`);
    process.exit(0);
  }).catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = seedBKRS;
