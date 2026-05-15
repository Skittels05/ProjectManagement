import { DataTypes, type Sequelize } from "sequelize";

export function defineSprint(sequelize: Sequelize) {
  return sequelize.define(
    "Sprint",
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      goal: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      startsAt: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "starts_at",
      },
      endsAt: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "ends_at",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "planned",
      },
    },
    {
      tableName: "sprints",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );
}
