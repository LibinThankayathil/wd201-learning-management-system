'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Chapter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // A chapter belongs to a course
      Chapter.belongsTo(models.Course, {
        foreignKey: 'courseId',
        as: 'course'
      });

      // A chapter has many pages
      Chapter.hasMany(models.Page, {
        foreignKey: 'chapterId',
        as: 'pages'
      });
    }
  }
  Chapter.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Courses',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Chapter',
  });
  return Chapter;
};