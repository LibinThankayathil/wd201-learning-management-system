'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Page extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // A page belongs to a chapter
      Page.belongsTo(models.Chapter, {
        foreignKey: 'chapterId',
        as: 'chapter'
      });

      // A page has many progress records
      Page.hasMany(models.Progress, {
        foreignKey: 'pageId'
      });
    }
  }
  Page.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    chapterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Chapters',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Page',
  });
  return Page;
};