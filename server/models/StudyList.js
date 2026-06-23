const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudyList = sequelize.define('StudyList', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'study_lists',
    timestamps: true,
    updatedAt: false
  });

  return StudyList;
};
