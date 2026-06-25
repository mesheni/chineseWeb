require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { sequelize, Dictionary } = require('./database');
const path = require('path');
const seedBKRS = require('./seed-bkrs');
const seedHSK = require('./seed-hsk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));

// Routes
const dictionaryRoutes = require('./routes/dictionary');
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

// Init database and start server
async function init() {
  try {
    await sequelize.sync({ force: false });
    console.log('Database synced');
    
    // Auto-seed BKRS if empty
    const count = await Dictionary.count();
    if (count === 0) {
      console.log('Dictionary empty, seeding BKRS...');
      await seedBKRS();
    } else {
      console.log(`Dictionary has ${count} entries`);
    }
    
    // Auto-seed HSK
    await seedHSK();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database error:', err);
  }
}

init();
