require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { sequelize, Dictionary, StudyList, StudyListWord } = require('./database');
const path = require('path');
const seedHSK = require('./seed-hsk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));

// Global rate limit: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Слишком много запросов, попробуйте позже' }
});
app.use(globalLimiter);

// Search-specific limit: 30 requests per minute
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Слишком много поисковых запросов, попробуйте через минуту' }
});

// Routes
const dictionaryRoutes = require('./routes/dictionary');
app.use('/api/dictionary/search', searchLimiter);
app.use('/api/dictionary', dictionaryRoutes);

const studyListRoutes = require('./routes/studyLists');
app.use('/api/study-lists', studyListRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const dictCount = await Dictionary.count();
    const hskCount = await Dictionary.count({ where: { source: 'hsk' } });
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      dictionary_entries: dictCount,
      hsk_loaded: hskCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

async function ensureHSKLists() {
  try {
    const levels = [1, 2, 3, 4, 5, 6];
    for (const level of levels) {
      const listName = `HSK ${level}`;
      const existing = await StudyList.findOne({ where: { name: listName } });
      if (existing) continue;

      const words = await Dictionary.findAll({ where: { source: 'hsk', hsk_level: level } });
      if (!words.length) continue;

      const list = await StudyList.create({ name: listName, description: `HSK 3.0 Уровень ${level}` });

      const wordRecords = words.map(w => ({
        list_id: list.id,
        dictionary_id: w.id,
        interval: 0,
        ease_factor: 2.5,
        next_review: new Date()
      }));

      for (let i = 0; i < wordRecords.length; i += 200) {
        await StudyListWord.bulkCreate(wordRecords.slice(i, i + 200), { ignoreDuplicates: true });
      }
      console.log(`Auto-created list: ${listName} (${wordRecords.length} words)`);
    }
  } catch (err) {
    console.error('ensureHSKLists error:', err.message);
  }
}

// Init database and start server
async function init() {
  try {
    await sequelize.sync({ force: false });
    if (process.env.NODE_ENV !== 'test') {
      console.log('Database synced');
    }

    // Auto-seed HSK
    await seedHSK();

    // Auto-create HSK study lists
    await ensureHSKLists();

    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  } catch (err) {
    console.error('Database error:', err);
  }
}

if (require.main === module) {
  init();
}

module.exports = app;
