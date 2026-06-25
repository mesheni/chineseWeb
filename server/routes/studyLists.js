const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { StudyList, StudyListWord, Dictionary } = require('../database');
const { calculateReview } = require('../srs');

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
    res.status(500).json({ error: error.message });
  }
});

// Create list
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const list = await StudyList.create({ name, description: description || '' });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// ---- Words in list ----

// Get words in a list
router.get('/:id/words', async (req, res) => {
  try {
    const list = await StudyList.findByPk(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    const words = await StudyListWord.findAll({
      where: { list_id: list.id },
      include: [{ model: Dictionary, as: 'entry' }],
      order: [['id', 'DESC']]
    });
    
    res.json({ list, words });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add word to list
router.post('/:id/words', async (req, res) => {
  try {
    const { dictionary_id } = req.body;
    if (!dictionary_id) return res.status(400).json({ error: 'dictionary_id is required' });
    
    const list = await StudyList.findByPk(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    const entry = await Dictionary.findByPk(dictionary_id);
    if (!entry) return res.status(404).json({ error: 'Dictionary entry not found' });
    
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// Submit review result
router.post('/:id/review', async (req, res) => {
  try {
    const { word_id, quality } = req.body;
    if (!word_id || quality === undefined) {
      return res.status(400).json({ error: 'word_id and quality (1-5) required' });
    }
    
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
    res.status(500).json({ error: error.message });
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
    
    res.json({ list_name: list.name, total, due_today: dueToday, reviewed });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    
    let linked = 0;
    for (const w of words) {
      try {
        await StudyListWord.create({
          list_id: list.id,
          dictionary_id: w.id,
          interval: 0, ease_factor: 2.5, next_review: new Date()
        });
        linked++;
      } catch (e) { /* duplicate */ }
    }
    
    res.json({ list, linked, total: words.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
