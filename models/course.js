'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // A course belongs to an educator (user)
      Course.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'educator'
      });

      // A course has many chapters
      Course.hasMany(models.Chapter, {
        foreignKey: 'courseId',
        as: 'chapters'
      });

      // A course can have many students enrolled
      Course.belongsToMany(models.User, {
        through: models.Enrollment,
        foreignKey: 'courseId',
        as: 'students'
      });
    }
  }
  Course.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Course',
  });
  return Course;
};