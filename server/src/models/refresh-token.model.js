const { DataTypes } = require("sequelize");

function defineRefreshToken(sequelize) {
  return sequelize.define(
    "RefreshToken",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
    },
    {
      tableName: "refresh_tokens",
      underscored: true,
      updatedAt: false,
    },
  );
}

module.exports = { defineRefreshToken };
