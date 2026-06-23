const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudyListWord = sequelize.define('StudyListWord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    list_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'study_lists', key: 'id' }
    },
    dictionary_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'dictionary', key: 'id' }
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
    tableName: 'study_list_words',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['list_id', 'dictionary_id'] },
      { fields: ['list_id'] },
      { fields: ['next_review'] }
    ]
  });

  return StudyListWord;
};
