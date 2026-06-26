const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Dictionary } = require('../database');
const { validateSearchParams } = require('../validation');
const { safeError } = require('../utils');

// Search dictionary
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const length = req.query.length ? parseInt(req.query.length) : null;
    const err = validateSearchParams(req.query.limit, req.query.offset);
    if (err) return res.status(400).json(err);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    if (!q && !length) {
      return res.json({ total: 0, offset, limit, results: [] });
    }

    const where = { source: 'hsk' };

    if (q) {
      const escaped = q.replace(/[%_]/g, '\\$&');
      where[Op.or] = [
        { chinese: { [Op.like]: `%${escaped}%` } },
        { russian_word: { [Op.like]: `%${escaped}%` } },
        { pinyin: { [Op.like]: `%${escaped}%` } }
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
    safeError(res, error);
  }
});

// Get by ID
router.get('/:id', async (req, res) => {
  try {
    const entry = await Dictionary.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (error) {
    safeError(res, error);
  }
});

module.exports = router;
