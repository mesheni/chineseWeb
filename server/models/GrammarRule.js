const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GrammarRule = sequelize.define('GrammarRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      index: true
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    examples: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of {chinese, russian}'
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      index: true
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'grammar_rules',
    timestamps: false
  });

  return GrammarRule;
};
