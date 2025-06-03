'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Chapters', 'order', {
  type: Sequelize.INTEGER,
  allowNull: false,
  defaultValue: 0, // or whatever makes sense
});
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Chapters', 'order');
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
