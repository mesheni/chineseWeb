const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Dictionary } = require('../database');

// Search dictionary
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const length = req.query.length ? parseInt(req.query.length) : null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    if (!q) {
      return res.json({ total: 0, offset, limit, results: [] });
    }

    const where = { source: 'hsk' };

    if (q) {
      where[Op.or] = [
        { chinese: { [Op.like]: `%${q}%` } },
        { russian_word: { [Op.like]: `%${q}%` } }
      ];
    }

    if (length) {
      where.char_length = length;
    }

    const { rows, count } = await Dictionary.findAndCountAll({
      where,
      limit,
      offset,
      order: [['char_length', 'ASC'], ['chinese', 'ASC']]
    });

    res.json({ total: count, offset, limit, results: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get by ID
router.get('/:id', async (req, res) => {
  try {
    const entry = await Dictionary.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
