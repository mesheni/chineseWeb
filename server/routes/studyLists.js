const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const { StudyList, StudyListWord, Dictionary } = require('../database');
const { calculateReview } = require('../srs');
const { validateListName, validateDictionaryId, validateReviewInput } = require('../validation');
const { safeError } = require('../utils');

const reviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Слишком много запросов на повторение, попробуйте через минуту' }
});

// ---- Lists CRUD ----

// Get all lists
router.get('/', async (req, res) => {
  try {
    const lists = await StudyList.findAll({
      include: [{
        model: StudyListWord,
        as: 'words',
        attributes: []
      }],
      attributes: {
        include: [
          [require('sequelize').fn('COUNT', require('sequelize').col('words.id')), 'word_count']
        ]
      },
      group: ['StudyList.id'],
      order: [['createdAt', 'DESC']]
    });
    res.json(lists);
  } catch (error) {
    safeError(res, error);
  }
});

// Create list
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    const err = validateListName(name);
    if (err) return res.status(400).json(err);
    const list = await StudyList.create({ name: name.trim(), description: description || '' });
    res.json(list);
  } catch (error) {
    safeError(res, error);
  }
});

// Delete list
router.delete('/:id', async (req, res) => {
  try {
    const list = await StudyList.findByPk(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    await StudyListWord.destroy({ where: { list_id: list.id } });
    await list.destroy();
    res.json({ success: true });
  } catch (error) {
    safeError(res, error);
  }
});

// ---- Words in list ----

// Get words in a list
router.get('/:id/words', async (req, res) => {
  try {
    const list = await StudyList.findByPk(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    const { sort, order: ord } = req.query;
    let orderClause;
    const asc = ord === 'asc' ? 'ASC' : 'DESC';
    if (sort === 'chinese') orderClause = [[{ model: Dictionary, as: 'entry' }, 'chinese', asc]];
    else if (sort === 'created') orderClause = [['id', asc]];
    else if (sort === 'next_review') orderClause = [['next_review', asc]];
    else orderClause = [['id', 'DESC']];
    
    const words = await StudyListWord.findAll({
      where: { list_id: list.id },
      include: [{ model: Dictionary, as: 'entry' }],
      order: orderClause
    });
    
    res.json({ list, words });
  } catch (error) {
    safeError(res, error);
  }
});

// Add word to list
router.post('/:id/words', async (req, res) => {
  try {
    const { dictionary_id } = req.body;
    const err = validateDictionaryId(dictionary_id);
    if (err) return res.status(400).json(err);

    const list = await StudyList.findByPk(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });

    const entry = await Dictionary.findByPk(dictionary_id);
    if (!entry) return res.status(404).json({ error: 'Dictionary entry not found' });

    // Check if word already in list
    const existing = await StudyListWord.findOne({
      where: { list_id: list.id, dictionary_id }
    });
    if (existing) {
      return res.json({ word: existing, created: false });
    }

    // Enforce MAX_NEW_WORDS_PER_DAY limit
    // Используем next_review как прокси для времени создания:
    // при добавлении нового слова next_review = new Date(),
    // после review оно обновляется на будущее.
    const maxNew = parseInt(process.env.MAX_NEW_WORDS_PER_DAY) || 0;
    if (maxNew > 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayCount = await StudyListWord.count({
        where: {
          next_review: { [Op.gte]: todayStart },
          review_count: 0
        }
      });
      if (todayCount >= maxNew) {
        return res.status(429).json({
          error: `Лимит новых слов на сегодня (${maxNew}) исчерпан`
        });
      }
    }

    const [word, created] = await StudyListWord.findOrCreate({
      where: { list_id: list.id, dictionary_id },
      defaults: {
        list_id: list.id,
        dictionary_id,
        interval: 0,
        ease_factor: 2.5,
        next_review: new Date(),
        review_count: 0,
        quality_sum: 0
      }
    });

    res.json({ word, created });
  } catch (error) {
    safeError(res, error);
  }
});

// Remove word from list
router.delete('/:id/words/:wordId', async (req, res) => {
  try {
    const deleted = await StudyListWord.destroy({
      where: { list_id: req.params.id, id: req.params.wordId }
    });
    if (!deleted) return res.status(404).json({ error: 'Word not in list' });
    res.json({ success: true });
  } catch (error) {
    safeError(res, error);
  }
});

// ---- SRS Review ----

// Get words due for review
router.get('/:id/review', async (req, res) => {
  try {
    const list = await StudyList.findByPk(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    const now = new Date();
    const words = await StudyListWord.findAll({
      where: {
        list_id: list.id,
        next_review: { [Op.lte]: now }
      },
      include: [{ model: Dictionary, as: 'entry' }],
      order: [['next_review', 'ASC']]
    });
    
    res.json({ list, due_count: words.length, words });
  } catch (error) {
    safeError(res, error);
  }
});

// Submit review result
router.post('/:id/review', reviewLimiter, async (req, res) => {
  try {
    const { word_id, quality } = req.body;
    const err = validateReviewInput(word_id, quality);
    if (err) return res.status(400).json(err);
    
    const word = await StudyListWord.findOne({
      where: { id: word_id, list_id: req.params.id }
    });
    if (!word) return res.status(404).json({ error: 'Word not found in list' });
    
    const result = calculateReview(
      quality,
      word.interval,
      word.ease_factor,
      word.review_count
    );
    
    word.interval = result.interval;
    word.ease_factor = result.easeFactor;
    word.next_review = result.nextReview;
    word.last_review = new Date();
    word.review_count = result.reviewCount;
    word.quality_sum += quality;
    
    await word.save();
    res.json(word);
  } catch (error) {
    safeError(res, error);
  }
});

// Stats for a list
router.get('/:id/stats', async (req, res) => {
  try {
    const list = await StudyList.findByPk(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    const total = await StudyListWord.count({ where: { list_id: list.id } });
    const dueToday = await StudyListWord.count({
      where: { list_id: list.id, next_review: { [Op.lte]: new Date() } }
    });
    const reviewed = await StudyListWord.count({
      where: { list_id: list.id, review_count: { [Op.gt]: 0 } }
    });
    
    const allWords = await StudyListWord.findAll({
      where: { list_id: list.id },
      attributes: ['id', 'review_count', 'last_review', 'ease_factor']
    });
    
    const problemWords = allWords.filter(w => w.review_count > 0 && w.ease_factor < 2.0).length;
    const newWords = allWords.filter(w => w.review_count === 0).length;
    
    let streak = 0;
    if (allWords.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dates = [...new Set(
        allWords
          .filter(w => w.last_review)
          .map(w => {
            const d = new Date(w.last_review);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          })
      )].sort((a, b) => b - a);
      
      for (let d = today.getTime(); ; d -= 86400000) {
        if (dates.includes(d)) {
          streak++;
        } else if (d < today.getTime()) {
          break;
        }
      }
    }
    
    res.json({ list_name: list.name, total, due_today: dueToday, reviewed, streak, new_words: newWords, problem_words: problemWords });
  } catch (error) {
    safeError(res, error);
  }
});

// Daily stats for the last 30 days
router.get('/:id/stats/daily', async (req, res) => {
  try {
    const list = await StudyList.findByPk(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const words = await StudyListWord.findAll({
      where: {
        list_id: list.id,
        last_review: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: ['last_review'],
      order: [['last_review', 'ASC']]
    });
    
    const daily = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      daily[key] = 0;
    }
    
    for (const w of words) {
      const d = new Date(w.last_review);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      if (daily[key] !== undefined) daily[key]++;
    }
    
    const result = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
    
    res.json(result);
  } catch (error) {
    safeError(res, error);
  }
});

// ---- HSK Import ----

// Get available HSK levels
router.get('/hsk/available', async (req, res) => {
  try {
    const levels = await Dictionary.findAll({
      attributes: ['hsk_level'],
      where: { source: 'hsk' },
      group: ['hsk_level'],
      order: [['hsk_level', 'ASC']]
    });
    const result = [];
    for (const l of levels) {
      const count = await Dictionary.count({ where: { source: 'hsk', hsk_level: l.hsk_level } });
      result.push({ level: l.hsk_level, word_count: count });
    }
    res.json(result);
  } catch (error) {
    safeError(res, error);
  }
});

// Import HSK level as a study list
router.post('/hsk/import/:level', async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const listName = `HSK ${level}`;
    
    // Check if already exists
    const existing = await StudyList.findOne({ where: { name: listName } });
    if (existing) {
      return res.json({ list: existing, already_exists: true });
    }
    
    const words = await Dictionary.findAll({ where: { source: 'hsk', hsk_level: level } });
    if (!words.length) {
      return res.status(404).json({ error: `HSK level ${level} not found` });
    }
    
    const list = await StudyList.create({
      name: listName,
      description: `HSK 3.0 Уровень ${level} — ${words.length} слов`
    });
    
    const records = words.map(w => ({
      list_id: list.id,
      dictionary_id: w.id,
      interval: 0, ease_factor: 2.5, next_review: new Date()
    }));
    
    // Bulk insert in batches of 500 for SQLite performance
    for (let i = 0; i < records.length; i += 500) {
      await StudyListWord.bulkCreate(records.slice(i, i + 500), { ignoreDuplicates: true });
    }
    const linked = records.length;
    
    res.json({ list, linked, total: words.length });
  } catch (error) {
    safeError(res, error);
  }
});

module.exports = router;
