const { DataTypes } = require("sequelize");

function defineProject(sequelize) {
  return sequelize.define(
    "Project",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "created_by",
      },
    },
    {
      tableName: "projects",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );
}

module.exports = { defineProject };
