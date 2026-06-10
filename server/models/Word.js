const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Word = sequelize.define('Word', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  character: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  pinyin: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  translation: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  example: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  difficulty: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  tableName: 'words',
  timestamps: false
});

module.exports = Word;