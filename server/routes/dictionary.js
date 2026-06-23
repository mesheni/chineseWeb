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
    
    if (!q && !length) {
      return res.status(400).json({ error: 'Provide q (query) or length filter' });
    }
    
    const where = {};
    
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

// Random entry
router.get('/random/any', async (req, res) => {
  try {
    const length = req.query.length ? parseInt(req.query.length) : null;
    const where = length ? { char_length: length } : {};
    const count = await Dictionary.count({ where });
    if (count === 0) return res.status(404).json({ error: 'No entries found' });
    const random = await Dictionary.findOne({
      where,
      offset: Math.floor(Math.random() * count)
    });
    res.json(random);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
