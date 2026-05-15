import { DataTypes, type Sequelize } from "sequelize";

export function defineTimeLog(sequelize: Sequelize) {
  return sequelize.define(
    "TimeLog",
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
      minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      loggedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "logged_at",
      },
    },
    {
      tableName: "time_logs",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );
}
