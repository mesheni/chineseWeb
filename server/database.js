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
const GrammarRule = require('./models/GrammarRule')(sequelize);
const GrammarExercise = require('./models/GrammarExercise')(sequelize);

// Associations
StudyList.hasMany(StudyListWord, { foreignKey: 'list_id', as: 'words' });
StudyListWord.belongsTo(StudyList, { foreignKey: 'list_id' });
StudyListWord.belongsTo(Dictionary, { foreignKey: 'dictionary_id', as: 'entry' });
GrammarRule.hasMany(GrammarExercise, { foreignKey: 'rule_id', as: 'exercises' });
GrammarExercise.belongsTo(GrammarRule, { foreignKey: 'rule_id' });

module.exports = { sequelize, Dictionary, StudyList, StudyListWord, GrammarRule, GrammarExercise };
