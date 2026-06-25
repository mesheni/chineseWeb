/**
 * Seed script — загружает HSK1-6.json в таблицу dictionary.
 * Читает HSK1.json … HSK6.json из корня проекта, маппит в Dictionary.
 * А также сохраняет обратную совместимость: seed HskList из hsk30_data.json.
 */
const fs = require('fs');
const path = require('path');
const { sequelize, Dictionary, HskList, StudyList, StudyListWord } = require('./database');

const BATCH_SIZE = 500;

async function seedHSK() {
  // ============================================================
  // PHASE 2: Seed Dictionary from HSK1-6.json
  // ============================================================
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
        char_length: w.word.length
      });
    }
  }

  if (rows.length > 0) {
    // Deduplicate within HSK data (same chinese + russian_word + level)
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

  // ============================================================
  // OLD: Seed HskList from hsk30_data.json (backward compat)
  // Will be removed in Phase 4
  // ============================================================
  const jsonPath = path.join(__dirname, '..', 'data', 'hsk30_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('⚠️ hsk30_data.json not found, old HskList seed skipped');
    return rows.length;
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const words = JSON.parse(raw);
  console.log(`📖 HSK 3.0 data loaded: ${words.length} words`);

  const hskCount = await HskList.count();
  if (hskCount > 0) {
    console.log(`✅ HskList already seeded (${hskCount} entries), skipping old seed`);
    return rows.length;
  }

  const OLD_BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < words.length; i += OLD_BATCH) {
    const batch = words.slice(i, i + OLD_BATCH).map(w => ({
      level: w.level,
      word: w.word,
      pinyin: w.pinyin,
      translation: w.translation
    }));
    await HskList.bulkCreate(batch, { ignoreDuplicates: true });
    inserted += batch.length;
  }
  console.log(`✅ Seeded ${inserted} words into hsk_lists (old)`);

  const hskLevels = [...new Set(words.map(w => w.level))].sort();
  for (const level of hskLevels) {
    const levelWords = words.filter(w => w.level === level);
    const listName = `HSK ${level}`;

    const existing = await StudyList.findOne({ where: { name: listName } });
    if (existing) continue;

    const list = await StudyList.create({
      name: listName,
      description: `HSK 3.0 Уровень ${level} — ${levelWords.length} слов`
    });

    let linked = 0;
    for (const w of levelWords) {
      const entries = await Dictionary.findAll({ where: { chinese: w.word }, limit: 1 });
      if (entries.length > 0) {
        try {
          await StudyListWord.create({
            list_id: list.id,
            dictionary_id: entries[0].id,
            interval: 0,
            ease_factor: 2.5,
            next_review: new Date()
          });
          linked++;
        } catch (e) {}
      }
    }
    console.log(`   📋 "${listName}": ${levelWords.length} слов, ${linked} привязано к словарю`);
  }

  return rows.length;
}

if (require.main === module) {
  seedHSK().then(c => { console.log(`Done: ${c}`); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = seedHSK;
