'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;


// Associations

// User (Educator) has many Courses
db.User.hasMany(db.Course, { foreignKey: "userId" });
db.Course.belongsTo(db.User, { foreignKey: "userId" });

// Course has many Chapters
db.Course.hasMany(db.Chapter, { foreignKey: "courseId" });
db.Chapter.belongsTo(db.Course, { foreignKey: "courseId" });

// Chapter has many Pages
db.Chapter.hasMany(db.Page, { foreignKey: "chapterId" });
db.Page.belongsTo(db.Chapter, { foreignKey: "chapterId" });

// Many-to-many: User <-> Course through Enrollment
db.User.belongsToMany(db.Course, { through: db.Enrollment, foreignKey: "userId" });
db.Course.belongsToMany(db.User, { through: db.Enrollment, foreignKey: "courseId" });

// Progress: User <-> Page
db.User.belongsToMany(db.Page, { through: db.Progress, foreignKey: "userId" });
db.Page.belongsToMany(db.User, { through: db.Progress, foreignKey: "pageId" });



module.exports = db;
