const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GrammarExercise = sequelize.define('GrammarExercise', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    rule_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true
    },
    sentence: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    options: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JSON array of option strings'
    },
    correct_index: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'grammar_exercises',
    timestamps: false
  });

  return GrammarExercise;
};
