import { DataTypes, type Sequelize } from "sequelize";

export function defineTaskAttachment(sequelize: Sequelize) {
  return sequelize.define(
    "TaskAttachment",
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
      uploadedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "uploaded_by",
      },
      originalFilename: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: "original_filename",
      },
      storageKey: {
        type: DataTypes.STRING(1024),
        allowNull: false,
        field: "storage_key",
      },
      mimeType: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "mime_type",
      },
      sizeBytes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "size_bytes",
      },
    },
    {
      tableName: "task_attachments",
      underscored: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );
}
