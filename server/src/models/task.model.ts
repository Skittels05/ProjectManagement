import { DataTypes, type Sequelize } from "sequelize";

export function defineTask(sequelize: Sequelize) {
  return sequelize.define(
    "Task",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      projectId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "project_id",
      },
      sprintId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "sprint_id",
      },
      title: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "todo",
      },
      storyPoints: {
        type: DataTypes.SMALLINT,
        allowNull: true,
        field: "story_points",
      },
      priority: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0,
      },
      boardPosition: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "board_position",
      },
      assigneeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "assignee_id",
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "created_by",
      },
    },
    {
      tableName: "tasks",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );
}
