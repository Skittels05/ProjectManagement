import { DataTypes, type Sequelize } from "sequelize";

export function defineTaskComment(sequelize: Sequelize) {
  return sequelize.define(
    "TaskComment",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      taskId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "task_id",
      },
      userId: {
        type: DataTypes.UUID,
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
