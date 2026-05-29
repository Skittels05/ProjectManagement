"use strict";

const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const DEMO_PASSWORD = "Demo12345!";
const USER_COUNT = 10;
const PROJECT_COUNT = 6;
const TASKS_PER_PROJECT = 16;

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const users = Array.from({ length: USER_COUNT }, (_, index) => {
      const userNumber = index + 1;
      return {
        id: randomUUID(),
        email: `demo.user${userNumber}@example.com`,
        password_hash: passwordHash,
        full_name: `Demo User ${userNumber}`,
        is_admin: userNumber <= 2,
        is_blocked: false,
      };
    });

    await queryInterface.bulkInsert("users", users);

    const projects = Array.from({ length: PROJECT_COUNT }, (_, index) => {
      const projectNumber = index + 1;
      const owner = users[index % users.length];
      return {
        id: randomUUID(),
        name: `Demo Project ${projectNumber}`,
        description: `Demo workspace #${projectNumber} for quick local testing.`,
        created_by: owner.id,
        wip_limit_todo: 14,
        wip_limit_in_progress: 8,
        wip_limit_done: 20,
        created_at: now,
        updated_at: now,
      };
    });

    await queryInterface.bulkInsert("projects", projects);

    const projectMembers = [];
    projects.forEach((project, projectIndex) => {
      const owner = users[projectIndex % users.length];
      projectMembers.push({
        id: randomUUID(),
        project_id: project.id,
        user_id: owner.id,
        role: "owner",
        created_at: now,
        updated_at: now,
      });

      const offset = projectIndex + 1;
      for (let i = 0; i < 3; i += 1) {
        const member = users[(offset + i) % users.length];
        projectMembers.push({
          id: randomUUID(),
          project_id: project.id,
          user_id: member.id,
          role: i === 0 ? "manager" : "member",
          created_at: now,
          updated_at: now,
        });
      }
    });

    projectMembers.push(
      {
        id: randomUUID(),
        project_id: projects[0].id,
        user_id: users[7].id,
        role: "member",
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        project_id: projects[1].id,
        user_id: users[8].id,
        role: "member",
        created_at: now,
        updated_at: now,
      },
    );

    await queryInterface.bulkInsert("project_members", projectMembers);

    const sprints = [];
    projects.forEach((project, projectIndex) => {
      for (let i = 0; i < 2; i += 1) {
        const sprintNumber = i + 1;
        const startsAt = daysAgo(28 - projectIndex * 2 - i * 14);
        const endsAt = daysAgo(14 - projectIndex * 2 - i * 14);
        sprints.push({
          id: randomUUID(),
          project_id: project.id,
          name: `Sprint ${sprintNumber}`,
          goal: `Goal for ${project.name}, sprint ${sprintNumber}.`,
          starts_at: startsAt.toISOString().slice(0, 10),
          ends_at: endsAt.toISOString().slice(0, 10),
          status: i === 0 ? "completed" : "active",
          created_at: now,
          updated_at: now,
        });
      }
    });

    await queryInterface.bulkInsert("sprints", sprints);

    const projectSprints = new Map();
    sprints.forEach((sprint) => {
      const list = projectSprints.get(sprint.project_id) || [];
      list.push(sprint);
      projectSprints.set(sprint.project_id, list);
    });

    const tasks = [];
    const statusCycle = ["todo", "in_progress", "done"];
    projects.forEach((project, projectIndex) => {
      const sprintList = projectSprints.get(project.id) || [];
      const boardPositionByStatus = { todo: 0, in_progress: 0, done: 0 };

      for (let i = 0; i < TASKS_PER_PROJECT; i += 1) {
        const status = statusCycle[i % statusCycle.length];
        boardPositionByStatus[status] += 1;
        const assignee = users[(projectIndex + i) % users.length];
        const author = users[(projectIndex + i + 1) % users.length];
        const sprint = i % 2 === 0 ? sprintList[i % sprintList.length] : null;
        tasks.push({
          id: randomUUID(),
          project_id: project.id,
          sprint_id: sprint ? sprint.id : null,
          parent_task_id: null,
          title: `[DEMO] Task ${i + 1} / ${project.name}`,
          description: `Demo task ${i + 1} created for seeded test data.`,
          status,
          story_points: (i % 8) + 1,
          priority: i % 3,
          board_position: boardPositionByStatus[status],
          assignee_id: assignee.id,
          created_by: author.id,
          created_at: daysAgo(20 - (i % 12)),
          updated_at: daysAgo(i % 8),
        });
      }
    });

    await queryInterface.bulkInsert("tasks", tasks);

    const comments = [];
    for (let i = 0; i < 30; i += 1) {
      const task = tasks[i * 3];
      const user = users[i % users.length];
      comments.push({
        id: randomUUID(),
        task_id: task.id,
        user_id: user.id,
        body: `Demo comment ${i + 1}: status check and next action.`,
        created_at: daysAgo(8 - (i % 6)),
        updated_at: daysAgo(8 - (i % 6)),
      });
    }

    await queryInterface.bulkInsert("task_comments", comments);

    const timeLogs = [];
    for (let i = 0; i < 14; i += 1) {
      const task = tasks[i * 5];
      const user = users[(i + 2) % users.length];
      timeLogs.push({
        id: randomUUID(),
        task_id: task.id,
        user_id: user.id,
        minutes: 30 + (i % 4) * 15,
        note: `Demo worklog ${i + 1}`,
        logged_at: daysAgo(7 - (i % 5)),
        created_at: now,
        updated_at: now,
      });
    }

    await queryInterface.bulkInsert("time_logs", timeLogs);

    const activityLogs = projects.map((project, index) => ({
      id: randomUUID(),
      project_id: project.id,
      user_id: users[index % users.length].id,
      action: "seed.demo_data_created",
      entity_type: "project",
      entity_id: project.id,
      metadata: JSON.stringify({
        source: "sequelize-seed",
        projectName: project.name,
      }),
      created_at: now,
    }));

    await queryInterface.bulkInsert("activity_logs", activityLogs);
  },

  async down(queryInterface, Sequelize) {
    const Op = Sequelize.Op;
    const [demoUsers] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email LIKE 'demo.user%@example.com';",
    );
    const userIds = demoUsers.map((row) => row.id);

    const [demoProjects] = await queryInterface.sequelize.query(
      "SELECT id FROM projects WHERE name LIKE 'Demo Project %';",
    );
    const projectIds = demoProjects.map((row) => row.id);

    const [demoTasks] = await queryInterface.sequelize.query(
      "SELECT id FROM tasks WHERE title LIKE '[DEMO] Task %';",
    );
    const taskIds = demoTasks.map((row) => row.id);

    if (taskIds.length > 0) {
      await queryInterface.bulkDelete("task_comments", { task_id: { [Op.in]: taskIds } });
      await queryInterface.bulkDelete("time_logs", { task_id: { [Op.in]: taskIds } });
      await queryInterface.bulkDelete("tasks", { id: { [Op.in]: taskIds } });
    }

    if (projectIds.length > 0) {
      await queryInterface.bulkDelete("activity_logs", {
        project_id: { [Op.in]: projectIds },
        action: "seed.demo_data_created",
      });
      await queryInterface.bulkDelete("sprints", { project_id: { [Op.in]: projectIds } });
      await queryInterface.bulkDelete("project_members", { project_id: { [Op.in]: projectIds } });
      await queryInterface.bulkDelete("projects", { id: { [Op.in]: projectIds } });
    }

    if (userIds.length > 0) {
      await queryInterface.bulkDelete("users", { id: { [Op.in]: userIds } });
    }
  },
};
