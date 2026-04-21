"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("projects", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.createTable("project_members", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "projects", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      role: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("project_members", ["project_id", "user_id"], {
      unique: true,
      name: "project_members_project_id_user_id_unique",
    });

    await queryInterface.createTable("sprints", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "projects", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      goal: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      starts_at: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      ends_at: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "planned",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("sprints", ["project_id"], {
      name: "sprints_project_id_idx",
    });

    await queryInterface.createTable("tasks", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "projects", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sprint_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "sprints", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "todo",
      },
      story_points: {
        type: Sequelize.SMALLINT,
        allowNull: true,
      },
      priority: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 0,
      },
      board_position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      assignee_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("tasks", ["project_id", "sprint_id"], {
      name: "tasks_project_id_sprint_id_idx",
    });
    await queryInterface.addIndex("tasks", ["assignee_id"], {
      name: "tasks_assignee_id_idx",
    });

    await queryInterface.createTable("task_comments", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tasks", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("task_comments", ["task_id"], {
      name: "task_comments_task_id_idx",
    });

    await queryInterface.createTable("task_attachments", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tasks", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      original_filename: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      storage_key: {
        type: Sequelize.STRING(1024),
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("task_attachments", ["task_id"], {
      name: "task_attachments_task_id_idx",
    });

    await queryInterface.createTable("time_logs", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tasks", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      logged_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("time_logs", ["task_id"], {
      name: "time_logs_task_id_idx",
    });
    await queryInterface.addIndex("time_logs", ["user_id"], {
      name: "time_logs_user_id_idx",
    });

    await queryInterface.createTable("activity_logs", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "projects", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      action: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("activity_logs", ["project_id", "created_at"], {
      name: "activity_logs_project_id_created_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("activity_logs");
    await queryInterface.dropTable("time_logs");
    await queryInterface.dropTable("task_attachments");
    await queryInterface.dropTable("task_comments");
    await queryInterface.dropTable("tasks");
    await queryInterface.dropTable("sprints");
    await queryInterface.dropTable("project_members");
    await queryInterface.dropTable("projects");
  },
};
