const express = require('express');
const router = express.Router();
const Word = require('../models/Word');

router.get('/', async (req, res) => {
  try {
    const words = await Word.findAll({
      attributes: ['id', 'character', 'pinyin', 'translation', 'category', 'difficulty']
    });
    res.json(words);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const word = await Word.findByPk(req.params.id);
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }
    res.json(word);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;