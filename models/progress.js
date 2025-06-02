'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Progress extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Progress belongs to a user
      Progress.belongsTo(models.User, {
        foreignKey: 'userId'
      });

      // Progress belongs to a page
      Progress.belongsTo(models.Page, {
        foreignKey: 'pageId'
      });
    }
  }
  Progress.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    pageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Pages',
        key: 'id'
      }
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Progress',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'pageId']
      }
    ]
  });
  return Progress;
};