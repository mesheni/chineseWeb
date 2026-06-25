const path = require('path');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_PATH || './data/database.sqlite',
  logging: false
});

// Import models
const Dictionary = require('./models/Dictionary')(sequelize);
const StudyList = require('./models/StudyList')(sequelize);
const StudyListWord = require('./models/StudyListWord')(sequelize);

// Associations
StudyList.hasMany(StudyListWord, { foreignKey: 'list_id', as: 'words' });
StudyListWord.belongsTo(StudyList, { foreignKey: 'list_id' });
StudyListWord.belongsTo(Dictionary, { foreignKey: 'dictionary_id', as: 'entry' });

module.exports = { sequelize, Dictionary, StudyList, StudyListWord };
