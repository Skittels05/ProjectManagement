import { DataTypes, type Sequelize } from "sequelize";

export function defineActivityLog(sequelize: Sequelize) {
  return sequelize.define(
    "ActivityLog",
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
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "user_id",
      },
      action: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      entityType: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "entity_type",
      },
      entityId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "entity_id",
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: "activity_logs",
      underscored: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );
}
