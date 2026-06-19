const StudyProgress = require('./models/StudyProgress');
const Word = require('./models/Word');

async function migrateFromLocalStorage(wordIds) {
  const results = { created: 0, skipped: 0, errors: [] };

  for (const wordId of wordIds) {
    try {
      const word = await Word.findByPk(wordId);
      if (!word) {
        results.errors.push(`Word id ${wordId} not found`);
        continue;
      }

      const existing = await StudyProgress.findOne({ where: { word_id: wordId } });
      if (existing) {
        results.skipped += 1;
        continue;
      }

      await StudyProgress.create({
        word_id: wordId,
        interval: 1,
        ease_factor: 2.5,
        review_count: 1,
        quality_sum: 4,
        next_review: new Date()
      });

      results.created += 1;
    } catch (err) {
      results.errors.push(`Error for word_id ${wordId}: ${err.message}`);
    }
  }

  return results;
}

module.exports = { migrateFromLocalStorage };
