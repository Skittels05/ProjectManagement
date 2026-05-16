"use strict";

/** Kanban order is stored on tasks.board_position (per project, sprint, status). */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("tasks", ["project_id", "status", "board_position"], {
      name: "tasks_project_status_board_position_idx",
    });
    await queryInterface.addIndex("tasks", ["project_id", "sprint_id", "status", "board_position"], {
      name: "tasks_project_sprint_status_board_position_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("tasks", "tasks_project_sprint_status_board_position_idx");
    await queryInterface.removeIndex("tasks", "tasks_project_status_board_position_idx");
  },
};
