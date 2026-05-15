"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("tasks", "parent_task_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "tasks", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.addIndex("tasks", ["parent_task_id"], {
      name: "tasks_parent_task_id_idx",
    });

    await queryInterface.addColumn("projects", "wip_limit_todo", {
      type: Sequelize.SMALLINT,
      allowNull: true,
    });
    await queryInterface.addColumn("projects", "wip_limit_in_progress", {
      type: Sequelize.SMALLINT,
      allowNull: true,
    });
    await queryInterface.addColumn("projects", "wip_limit_done", {
      type: Sequelize.SMALLINT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("projects", "wip_limit_done");
    await queryInterface.removeColumn("projects", "wip_limit_in_progress");
    await queryInterface.removeColumn("projects", "wip_limit_todo");
    await queryInterface.removeIndex("tasks", "tasks_parent_task_id_idx");
    await queryInterface.removeColumn("tasks", "parent_task_id");
  },
};
