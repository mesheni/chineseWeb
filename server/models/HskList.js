const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HskList = sequelize.define('HskList', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    word: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    pinyin: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    translation: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'hsk_lists',
    timestamps: false,
    indexes: [
      { fields: ['level'] }
    ]
  });

  return HskList;
};
