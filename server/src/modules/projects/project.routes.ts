import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { validationMiddleware } from "../../middlewares/validation.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import * as controller from "./project.controller";
import * as sprintController from "./sprint.controller";
import * as taskController from "./task.controller";
import * as taskCommentController from "./task-comment.controller";
import * as taskAttachmentController from "./task-attachment.controller";
import * as taskTimeLogController from "./task-time-log.controller";
import { handleTaskAttachmentUpload } from "../../middlewares/upload.middleware";
import {
  createProjectValidation,
  addMemberValidation,
  updateMemberRoleValidation,
  removeMemberValidation,
  getProjectByIdValidation,
  updateProjectValidation,
  deleteProjectValidation,
} from "./project.validation";
import {
  listSprintsValidation,
  createSprintValidation,
  updateSprintValidation,
  deleteSprintValidation,
} from "./sprint.validation";
import {
  listTasksValidation,
  createTaskValidation,
  updateTaskValidation,
  deleteTaskValidation,
  reorderKanbanValidation,
} from "./task.validation";
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
} from "./task-engagement.validation";

export const projectsRouter = Router();

projectsRouter.use(authMiddleware);

projectsRouter.get("/", asyncHandler(controller.list));
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
