const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Word = require('./Word');

const StudyProgress = sequelize.define('StudyProgress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  word_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Word,
      key: 'id'
    }
  },
  interval: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  ease_factor: {
    type: DataTypes.FLOAT,
    defaultValue: 2.5
  },
  next_review: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  last_review: {
    type: DataTypes.DATE,
    allowNull: true
  },
  review_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  quality_sum: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'study_progress',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['word_id']
    }
  ]
});

StudyProgress.belongsTo(Word, { foreignKey: 'word_id' });

module.exports = StudyProgress;
