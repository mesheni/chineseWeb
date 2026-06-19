const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const StudyProgress = require('../models/StudyProgress');
const Word = require('../models/Word');
const { calculateReview } = require('../srs');

router.post('/', async (req, res) => {
  try {
    const { word_id, quality, known } = req.body;

    if (!word_id) {
      return res.status(400).json({ error: 'word_id is required' });
    }

    let rating = quality;
    if (rating === undefined && known !== undefined) {
      rating = known ? 4 : 1;
    }

    if (rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'quality must be 1-5 or known must be true/false' });
    }

    const word = await Word.findByPk(word_id);
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    let progress = await StudyProgress.findOne({ where: { word_id } });

    if (!progress) {
      progress = await StudyProgress.create({ word_id });
    }

    const result = calculateReview(
      rating,
      progress.interval,
      progress.ease_factor,
      progress.review_count
    );

    progress.interval = result.interval;
    progress.ease_factor = result.easeFactor;
    progress.next_review = result.nextReview;
    progress.last_review = new Date();
    progress.review_count += 1;
    progress.quality_sum += rating;

    await progress.save();

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/studied', async (req, res) => {
  try {
    const progressList = await StudyProgress.findAll({
      include: [{ model: Word }],
      order: [['last_review', 'DESC']]
    });
    res.json(progressList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const now = new Date();

    const progressList = await StudyProgress.findAll({
      where: {
        next_review: { [Op.lte]: now }
      },
      include: [{ model: Word }],
      order: [['next_review', 'ASC']]
    });

    res.json(progressList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalWords = await Word.count();
    const studied = await StudyProgress.count({ where: { review_count: { [Op.gt]: 0 } } });
    const dueToday = await StudyProgress.count({
      where: { next_review: { [Op.lte]: new Date() } }
    });
    const inProgress = await StudyProgress.count({ where: { interval: { [Op.gt]: 0 } } });

    const sumResult = await StudyProgress.sum('quality_sum');
    const totalReviews = sumResult || 0;

    const knownWords = await StudyProgress.count({ where: { interval: { [Op.gte]: 1 } } });

    res.json({
      total_words: totalWords,
      studied,
      due_today: dueToday,
      in_progress: inProgress,
      total_reviews: totalReviews,
      known_words: knownWords
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const records = await StudyProgress.findAll();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const records = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Request body must be a JSON array' });
    }

    let imported = 0;
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record.word_id) {
        errors.push({ index: i, error: 'word_id is required' });
        continue;
      }

      try {
        const existing = await StudyProgress.findOne({ where: { word_id: record.word_id } });
        if (existing) {
          await existing.update({
            interval: record.interval !== undefined ? record.interval : existing.interval,
            ease_factor: record.ease_factor !== undefined ? record.ease_factor : existing.ease_factor,
            next_review: record.next_review || existing.next_review,
            last_review: record.last_review || existing.last_review,
            review_count: record.review_count !== undefined ? record.review_count : existing.review_count,
            quality_sum: record.quality_sum !== undefined ? record.quality_sum : existing.quality_sum
          });
        } else {
          await StudyProgress.create({
            word_id: record.word_id,
            interval: record.interval || 0,
            ease_factor: record.ease_factor || 2.5,
            next_review: record.next_review || new Date(),
            last_review: record.last_review || null,
            review_count: record.review_count || 0,
            quality_sum: record.quality_sum || 0
          });
        }
        imported++;
      } catch (err) {
        errors.push({ index: i, word_id: record.word_id, error: err.message });
      }
    }

    res.json({ imported, errors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
