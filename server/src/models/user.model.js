const { DataTypes } = require("sequelize");

function defineUser(sequelize) {
  return sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "password_hash",
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "full_name",
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: "is_admin",
      },
      isBlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: "is_blocked",
      },
    },
    {
      tableName: "users",
      underscored: true,
      timestamps: false,
    },
  );
}

module.exports = { defineUser };
