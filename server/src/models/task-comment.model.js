const { DataTypes } = require("sequelize");

function defineTaskComment(sequelize) {
  return sequelize.define(
    "TaskComment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      taskId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "task_id",
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: "task_comments",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );
}

module.exports = { defineTaskComment };
