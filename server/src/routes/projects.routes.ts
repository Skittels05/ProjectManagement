import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { validationMiddleware } from "../middlewares/validation.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as controller from "../controllers/project.controller";
import * as sprintController from "../controllers/sprint.controller";
import * as taskController from "../controllers/task.controller";
import * as taskCommentController from "../controllers/task-comment.controller";
import * as taskAttachmentController from "../controllers/task-attachment.controller";
import * as taskTimeLogController from "../controllers/task-time-log.controller";
import * as analyticsController from "../controllers/analytics.controller";
import * as analyticsExportController from "../controllers/analytics-export.controller";
import { handleTaskAttachmentUpload } from "../middlewares/upload.middleware";
import {
  listProjectsValidation,
  createProjectValidation,
  addMemberValidation,
  updateMemberRoleValidation,
  removeMemberValidation,
  getProjectByIdValidation,
  updateProjectValidation,
  deleteProjectValidation,
} from "../validation/project.validation";
import {
  listSprintsValidation,
  createSprintValidation,
  updateSprintValidation,
  deleteSprintValidation,
} from "../validation/sprint.validation";
import {
  listTasksValidation,
  createTaskValidation,
  updateTaskValidation,
  deleteTaskValidation,
  reorderKanbanValidation,
} from "../validation/task.validation";
import {
  listCommentsValidation,
  createCommentValidation,
  updateCommentValidation,
  deleteCommentValidation,
  listAttachmentsValidation,
  downloadAttachmentValidation,
  deleteAttachmentValidation,
  listTimeLogsValidation,
  createTimeLogValidation,
  updateTimeLogValidation,
  deleteTimeLogValidation,
} from "../validation/task-engagement.validation";
import {
  listActivityValidation,
  projectAnalyticsValidation,
  sprintAnalyticsValidation,
  timeLogReportValidation,
} from "../validation/analytics.validation";
import { exportAnalyticsPdfValidation } from "../validation/analytics-export.validation";

export const projectsRouter = Router();

projectsRouter.use(authMiddleware);

projectsRouter.get("/", listProjectsValidation, validationMiddleware, asyncHandler(controller.list));
projectsRouter.post("/", createProjectValidation, validationMiddleware, asyncHandler(controller.create));
projectsRouter.post(
  "/:projectId/members",
  addMemberValidation,
  validationMiddleware,
  asyncHandler(controller.addMember),
);
projectsRouter.patch(
  "/:projectId/members/:userId",
  updateMemberRoleValidation,
  validationMiddleware,
  asyncHandler(controller.updateMemberRole),
);
projectsRouter.delete(
  "/:projectId/members/:userId",
  removeMemberValidation,
  validationMiddleware,
  asyncHandler(controller.removeMember),
);
projectsRouter.get(
  "/:projectId/sprints",
  listSprintsValidation,
  validationMiddleware,
  asyncHandler(sprintController.list),
);
projectsRouter.post(
  "/:projectId/sprints",
  createSprintValidation,
  validationMiddleware,
  asyncHandler(sprintController.create),
);
projectsRouter.patch(
  "/:projectId/sprints/:sprintId",
  updateSprintValidation,
  validationMiddleware,
  asyncHandler(sprintController.update),
);
projectsRouter.delete(
  "/:projectId/sprints/:sprintId",
  deleteSprintValidation,
  validationMiddleware,
  asyncHandler(sprintController.remove),
);
projectsRouter.post(
  "/:projectId/analytics/export/pdf",
  exportAnalyticsPdfValidation,
  validationMiddleware,
  asyncHandler(analyticsExportController.exportPdf),
);
projectsRouter.get(
  "/:projectId/analytics/velocity",
  projectAnalyticsValidation,
  validationMiddleware,
  asyncHandler(analyticsController.teamVelocity),
);
projectsRouter.get(
  "/:projectId/analytics/sprints/:sprintId/stats",
  sprintAnalyticsValidation,
  validationMiddleware,
  asyncHandler(analyticsController.sprintStats),
);
projectsRouter.get(
  "/:projectId/analytics/sprints/:sprintId/burndown",
  sprintAnalyticsValidation,
  validationMiddleware,
  asyncHandler(analyticsController.sprintBurndown),
);
projectsRouter.get(
  "/:projectId/analytics/sprints/:sprintId/scatter",
  sprintAnalyticsValidation,
  validationMiddleware,
  asyncHandler(analyticsController.sprintScatter),
);
projectsRouter.get(
  "/:projectId/analytics/time-logs",
  timeLogReportValidation,
  validationMiddleware,
  asyncHandler(analyticsController.timeLogReport),
);
projectsRouter.get(
  "/:projectId/activity",
  listActivityValidation,
  validationMiddleware,
  asyncHandler(analyticsController.listActivity),
);
projectsRouter.get(
  "/:projectId/tasks",
  listTasksValidation,
  validationMiddleware,
  asyncHandler(taskController.list),
);
projectsRouter.post(
  "/:projectId/tasks",
  createTaskValidation,
  validationMiddleware,
  asyncHandler(taskController.create),
);
projectsRouter.patch(
  "/:projectId/tasks/kanban-order",
  reorderKanbanValidation,
  validationMiddleware,
  asyncHandler(taskController.reorderKanban),
);
projectsRouter.patch(
  "/:projectId/tasks/:taskId",
  updateTaskValidation,
  validationMiddleware,
  asyncHandler(taskController.update),
);
projectsRouter.delete(
  "/:projectId/tasks/:taskId",
  deleteTaskValidation,
  validationMiddleware,
  asyncHandler(taskController.remove),
);
projectsRouter.get(
  "/:projectId/tasks/:taskId/comments",
  listCommentsValidation,
  validationMiddleware,
  asyncHandler(taskCommentController.list),
);
projectsRouter.post(
  "/:projectId/tasks/:taskId/comments",
  createCommentValidation,
  validationMiddleware,
  asyncHandler(taskCommentController.create),
);
projectsRouter.patch(
  "/:projectId/tasks/:taskId/comments/:commentId",
  updateCommentValidation,
  validationMiddleware,
  asyncHandler(taskCommentController.update),
);
projectsRouter.delete(
  "/:projectId/tasks/:taskId/comments/:commentId",
  deleteCommentValidation,
  validationMiddleware,
  asyncHandler(taskCommentController.remove),
);
projectsRouter.get(
  "/:projectId/tasks/:taskId/attachments",
  listAttachmentsValidation,
  validationMiddleware,
  asyncHandler(taskAttachmentController.list),
);
projectsRouter.post(
  "/:projectId/tasks/:taskId/attachments",
  listAttachmentsValidation,
  validationMiddleware,
  handleTaskAttachmentUpload,
  asyncHandler(taskAttachmentController.upload),
);
projectsRouter.get(
  "/:projectId/tasks/:taskId/attachments/:attachmentId/file",
  downloadAttachmentValidation,
  validationMiddleware,
  asyncHandler(taskAttachmentController.download),
);
projectsRouter.delete(
  "/:projectId/tasks/:taskId/attachments/:attachmentId",
  deleteAttachmentValidation,
  validationMiddleware,
  asyncHandler(taskAttachmentController.remove),
);
projectsRouter.get(
  "/:projectId/tasks/:taskId/time-logs",
  listTimeLogsValidation,
  validationMiddleware,
  asyncHandler(taskTimeLogController.list),
);
projectsRouter.post(
  "/:projectId/tasks/:taskId/time-logs",
  createTimeLogValidation,
  validationMiddleware,
  asyncHandler(taskTimeLogController.create),
);
projectsRouter.patch(
  "/:projectId/tasks/:taskId/time-logs/:timeLogId",
  updateTimeLogValidation,
  validationMiddleware,
  asyncHandler(taskTimeLogController.update),
);
projectsRouter.delete(
  "/:projectId/tasks/:taskId/time-logs/:timeLogId",
  deleteTimeLogValidation,
  validationMiddleware,
  asyncHandler(taskTimeLogController.remove),
);
projectsRouter.patch(
  "/:projectId",
  updateProjectValidation,
  validationMiddleware,
  asyncHandler(controller.update),
);
projectsRouter.delete(
  "/:projectId",
  deleteProjectValidation,
  validationMiddleware,
  asyncHandler(controller.remove),
);
projectsRouter.get(
  "/:projectId",
  getProjectByIdValidation,
  validationMiddleware,
  asyncHandler(controller.getById),
);
