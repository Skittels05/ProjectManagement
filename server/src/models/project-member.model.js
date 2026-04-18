const { DataTypes } = require("sequelize");

/** project_members.role: owner | manager | member */
function defineProjectMember(sequelize) {
  return sequelize.define(
    "ProjectMember",
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
        allowNull: false,
        field: "user_id",
      },
      role: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
    },
    {
      tableName: "project_members",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );
}

module.exports = { defineProjectMember };
