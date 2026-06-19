const sequelize = require('./server/database');
const Word = require('./server/models/Word');
const words = require('./seed-data');

async function seed() {
  try {
    await sequelize.sync({ force: true });
    await Word.bulkCreate(words);
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();