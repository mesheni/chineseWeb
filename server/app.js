require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sequelize = require('./database');
const Word = require('./models/Word');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
const wordRoutes = require('./routes/words');
app.use('/api/words', wordRoutes);

const progressRoutes = require('./routes/progress');
app.use('/api/progress', progressRoutes);

app.get('/api/random', async (req, res) => {
  try {
    const count = await Word.count();
    const randomIndex = Math.floor(Math.random() * count);
    const word = await Word.findOne({ offset: randomIndex });
    res.json(word);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const count = await Word.count();
    res.json({ status: 'ok', uptime: process.uptime(), words: count, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../public/index.html');
});

// Initialize database and start server
async function init() {
  try {
    await sequelize.sync({ force: false });
    console.log('Database synced');
    const count = await Word.count();
    if (count === 0) {
      console.log('Database empty, seeding...');
      const seedData = require('../seed-data');
      await Word.bulkCreate(seedData);
      console.log('Database seeded');
    }
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database error:', err);
  }
}

init();