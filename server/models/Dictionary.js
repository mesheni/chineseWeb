const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Dictionary = sequelize.define('Dictionary', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    chinese: {
      type: DataTypes.STRING(200),
      allowNull: false,
      index: true
    },
    russian_word: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    definition: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    source: {
      type: DataTypes.STRING(20),
      defaultValue: 'bkrs'
    },
    char_length: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    tableName: 'dictionary',
    timestamps: false,
    indexes: [
      { fields: ['chinese'] },
      { fields: ['char_length'] }
    ]
  });

  return Dictionary;
};
