/**
 * Seed script — загружает HSK 3.0 данные в БД.
 * Читает data/hsk30_data.json, заполняет таблицу hsk_lists.
 * И создаёт study_list для каждого уровня.
 */
const fs = require('fs');
const path = require('path');
const { sequelize, HskList, StudyList, StudyListWord, Dictionary } = require('./database');

async function seedHSK() {
  const jsonPath = path.join(__dirname, '..', 'data', 'hsk30_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('⚠️ hsk30_data.json not found, skipping');
    return;
  }
  
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const words = JSON.parse(raw);
  console.log(`📖 HSK data loaded: ${words.length} words`);
  
  // Check if already seeded
  const count = await HskList.count();
  if (count > 0) {
    console.log(`✅ HSK already seeded (${count} entries), skipping`);
    return count;
  }
  
  // Batch insert into hsk_lists
  const BATCH_SIZE = 200;
  let inserted = 0;
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE).map(w => ({
      level: w.level,
      word: w.word,
      pinyin: w.pinyin,
      translation: w.translation
    }));
    await HskList.bulkCreate(batch, { ignoreDuplicates: true });
    inserted += batch.length;
  }
  console.log(`✅ Seeded ${inserted} words into hsk_lists`);
  
  // Create study_list for each HSK level
  const levels = [...new Set(words.map(w => w.level))].sort();
  for (const level of levels) {
    const levelWords = words.filter(w => w.level === level);
    const listName = `HSK ${level}`;
    
    // Check if list already exists
    const existing = await StudyList.findOne({ where: { name: listName } });
    if (existing) continue;
    
    const list = await StudyList.create({
      name: listName,
      description: `HSK 3.0 Уровень ${level} — ${levelWords.length} слов`
    });
    
    // Now try to link each word to dictionary entries
    // We search dictionary by Chinese text
    let linked = 0;
    for (const w of levelWords) {
      // Find the word in dictionary
      const entries = await Dictionary.findAll({
        where: { chinese: w.word },
        limit: 1
      });
      
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
        } catch (e) {
          // Duplicate or error, skip
        }
      }
    }
    
    console.log(`   📋 "${listName}": ${levelWords.length} слов, ${linked} привязано к словарю`);
  }
  
  return inserted;
}

if (require.main === module) {
  seedHSK().then(c => { console.log(`Done: ${c}`); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = seedHSK;
