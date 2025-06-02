'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Enrollment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Enrollment belongs to a user
      Enrollment.belongsTo(models.User, {
        foreignKey: 'userId'
      });

      // Enrollment belongs to a course
      Enrollment.belongsTo(models.Course, {
        foreignKey: 'courseId'
      });
    }
  }
  Enrollment.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
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
    modelName: 'Enrollment',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'courseId']
      }
    ]
  });
  return Enrollment;
};