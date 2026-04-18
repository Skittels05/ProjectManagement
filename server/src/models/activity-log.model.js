const { DataTypes } = require("sequelize");

function defineActivityLog(sequelize) {
  return sequelize.define(
    "ActivityLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "project_id",
      },
      userId: {
        type: DataTypes.INTEGER,
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
        type: DataTypes.INTEGER,
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

module.exports = { defineActivityLog };
