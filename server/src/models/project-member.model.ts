import { DataTypes, type Sequelize } from "sequelize";

export function defineProjectMember(sequelize: Sequelize) {
  return sequelize.define(
    "ProjectMember",
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
