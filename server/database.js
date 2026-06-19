const path = require('path');
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_PATH || './data/database.sqlite',
  logging: false
});

module.exports = sequelize;