'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // A user can create many courses (as an educator)
      User.hasMany(models.Course, {
        foreignKey: 'userId',
        as: 'createdCourses'
      });
      
      // A user can be enrolled in many courses (as a student)
      User.belongsToMany(models.Course, {
        through: models.Enrollment,
        foreignKey: 'userId',
        as: 'enrolledCourses'
      });

      // A user has many progress records
      User.hasMany(models.Progress, {
        foreignKey: 'userId'
      });
    }
  }
  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    role: {
      type: DataTypes.ENUM('student', 'educator'),
      allowNull: false,
      defaultValue: 'student'
    }
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};