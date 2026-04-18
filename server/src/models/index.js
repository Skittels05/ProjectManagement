const { sequelize } = require("../config/database");
const { defineUser } = require("./user.model");
const { defineRefreshToken } = require("./refresh-token.model");
const { defineProject } = require("./project.model");
const { defineProjectMember } = require("./project-member.model");
const { defineSprint } = require("./sprint.model");
const { defineTask } = require("./task.model");
const { defineTaskComment } = require("./task-comment.model");
const { defineTaskAttachment } = require("./task-attachment.model");
const { defineTimeLog } = require("./time-log.model");
const { defineActivityLog } = require("./activity-log.model");

const User = defineUser(sequelize);
const RefreshToken = defineRefreshToken(sequelize);
const Project = defineProject(sequelize);
const ProjectMember = defineProjectMember(sequelize);
const Sprint = defineSprint(sequelize);
const Task = defineTask(sequelize);
const TaskComment = defineTaskComment(sequelize);
const TaskAttachment = defineTaskAttachment(sequelize);
const TimeLog = defineTimeLog(sequelize);
const ActivityLog = defineActivityLog(sequelize);

User.hasMany(RefreshToken, {
  foreignKey: "userId",
  as: "refreshTokens",
});

RefreshToken.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

User.hasMany(Project, {
  foreignKey: "createdBy",
  as: "createdProjects",
});

Project.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

User.hasMany(ProjectMember, {
  foreignKey: "userId",
  as: "projectMemberships",
});

ProjectMember.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Project.hasMany(ProjectMember, {
  foreignKey: "projectId",
  as: "members",
});

ProjectMember.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

Project.hasMany(Sprint, {
  foreignKey: "projectId",
  as: "sprints",
});

Sprint.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

Project.hasMany(Task, {
  foreignKey: "projectId",
  as: "tasks",
});

Task.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

Sprint.hasMany(Task, {
  foreignKey: "sprintId",
  as: "tasks",
});

Task.belongsTo(Sprint, {
  foreignKey: "sprintId",
  as: "sprint",
});

User.hasMany(Task, {
  foreignKey: "assigneeId",
  as: "assignedTasks",
});

Task.belongsTo(User, {
  foreignKey: "assigneeId",
  as: "assignee",
});

User.hasMany(Task, {
  foreignKey: "createdBy",
  as: "authoredTasks",
});

Task.belongsTo(User, {
  foreignKey: "createdBy",
  as: "author",
});

Task.hasMany(TaskComment, {
  foreignKey: "taskId",
  as: "comments",
});

TaskComment.belongsTo(Task, {
  foreignKey: "taskId",
  as: "task",
});

User.hasMany(TaskComment, {
  foreignKey: "userId",
  as: "taskComments",
});

TaskComment.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Task.hasMany(TaskAttachment, {
  foreignKey: "taskId",
  as: "attachments",
});

TaskAttachment.belongsTo(Task, {
  foreignKey: "taskId",
  as: "task",
});

User.hasMany(TaskAttachment, {
  foreignKey: "uploadedBy",
  as: "uploadedAttachments",
});

TaskAttachment.belongsTo(User, {
  foreignKey: "uploadedBy",
  as: "uploader",
});

Task.hasMany(TimeLog, {
  foreignKey: "taskId",
  as: "timeLogs",
});

TimeLog.belongsTo(Task, {
  foreignKey: "taskId",
  as: "task",
});

User.hasMany(TimeLog, {
  foreignKey: "userId",
  as: "timeLogs",
});

TimeLog.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Project.hasMany(ActivityLog, {
  foreignKey: "projectId",
  as: "activityLogs",
});

ActivityLog.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

User.hasMany(ActivityLog, {
  foreignKey: "userId",
  as: "activityLogs",
});

ActivityLog.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

module.exports = {
  sequelize,
  User,
  RefreshToken,
  Project,
  ProjectMember,
  Sprint,
  Task,
  TaskComment,
  TaskAttachment,
  TimeLog,
  ActivityLog,
};
