const fs = require('fs');
const path = require('path');
const { sequelize, Dictionary } = require('./database');

const BATCH_SIZE = 500;

async function seedHSK() {
  const levels = [1, 2, 3, 4, 5, 6];
  let rows = [];

  for (const level of levels) {
    const filePath = path.join(__dirname, '..', `HSK${level}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ HSK${level}.json not found, skipping`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const words = JSON.parse(raw);
    console.log(`📖 HSK${level}.json loaded: ${words.length} words`);

    for (const w of words) {
      rows.push({
        chinese: w.word,
        russian_word: w.translation,
        pinyin: w.pinyin,
        hsk_level: level,
        source: 'hsk',
        char_length: w.word.length,
        examples: w.examples ? JSON.stringify(w.examples) : null
      });
    }
  }

  if (rows.length > 0) {
    const seen = new Set();
    const unique = [];
    for (const row of rows) {
      const key = `${row.chinese}|${row.russian_word}|${row.hsk_level}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(row);
      }
    }

    console.log(`📊 HSK rows: ${rows.length}, unique: ${unique.length}`);

    const alreadySeeded = await Dictionary.count({ where: { source: 'hsk' } });
    if (alreadySeeded === 0) {
      let inserted = 0;
      for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const batch = unique.slice(i, i + BATCH_SIZE);
        await Dictionary.bulkCreate(batch, { ignoreDuplicates: true });
        inserted += batch.length;
        if (inserted % 5000 === 0 || inserted === unique.length) {
          console.log(`  HSK→Dictionary progress: ${inserted}/${unique.length}`);
        }
      }
      console.log(`✅ Seeded ${inserted} HSK entries into dictionary`);
    } else {
      console.log(`✅ HSK already seeded in dictionary (${alreadySeeded} entries), skipping`);
    }
  }

  return rows.length;
}

if (require.main === module) {
  seedHSK().then(c => { console.log(`Done: ${c}`); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = seedHSK;
