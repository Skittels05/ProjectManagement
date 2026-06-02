import { body, param } from "express-validator";

const projectIdParam = param("projectId").isUUID(4).withMessage("Invalid project id");
const taskIdParam = param("taskId").isUUID(4).withMessage("Invalid task id");
const commentIdParam = param("commentId").isUUID(4).withMessage("Invalid comment id");
const attachmentIdParam = param("attachmentId").isUUID(4).withMessage("Invalid attachment id");
const timeLogIdParam = param("timeLogId").isUUID(4).withMessage("Invalid time log id");

export const taskEngagementParams = [projectIdParam, taskIdParam];

export const listCommentsValidation = taskEngagementParams;
export const createCommentValidation = [
  ...taskEngagementParams,
  body("body").trim().notEmpty().withMessage("Comment is required").isLength({ max: 10000 }),
];
export const updateCommentValidation = [
  ...taskEngagementParams,
  commentIdParam,
  body("body").trim().notEmpty().withMessage("Comment is required").isLength({ max: 10000 }),
];
export const deleteCommentValidation = [...taskEngagementParams, commentIdParam];

export const listAttachmentsValidation = taskEngagementParams;
export const downloadAttachmentValidation = [...taskEngagementParams, attachmentIdParam];
export const deleteAttachmentValidation = [...taskEngagementParams, attachmentIdParam];

export const listTimeLogsValidation = taskEngagementParams;
export const createTimeLogValidation = [
  ...taskEngagementParams,
  body("minutes")
    .isInt({ min: 1, max: 1440 })
    .withMessage("Minutes must be between 1 and 1440"),
  body("note").optional({ values: "falsy" }).isString().isLength({ max: 2000 }),
  body("loggedAt").optional({ values: "falsy" }).isISO8601().withMessage("Invalid date"),
];
export const updateTimeLogValidation = [
  ...taskEngagementParams,
  timeLogIdParam,
  body("minutes").optional().isInt({ min: 1, max: 1440 }),
  body("note").optional({ values: "null" }).isString().isLength({ max: 2000 }),
  body("loggedAt").optional({ values: "falsy" }).isISO8601(),
  body().custom((_, { req }) => {
    const b = req.body as Record<string, unknown>;
    if (!["minutes", "note", "loggedAt"].some((k) => Object.prototype.hasOwnProperty.call(b, k))) {
      throw new Error("Provide at least one field to update");
    }
    return true;
  }),
];
export const deleteTimeLogValidation = [...taskEngagementParams, timeLogIdParam];
