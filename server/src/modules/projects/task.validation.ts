import { body, param, query } from "express-validator";

const projectIdParam = param("projectId").isUUID(4).withMessage("Invalid project id");

const taskIdParam = param("taskId").isUUID(4).withMessage("Invalid task id");

const optionalTaskStatus = body("status")
  .optional()
  .trim()
  .custom((value) => {
    const s = String(value).toLowerCase();
    const normalized = s === "in progress" ? "in_progress" : s;
    if (!["todo", "in_progress", "done"].includes(normalized)) {
      throw new Error("Status must be todo, in_progress, or done");
    }
    return true;
  });

const optionalUuidOrEmpty = (field: string) =>
  body(field)
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === "") {
        return true;
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(value))) {
        throw new Error(`${field} must be a UUID or empty`);
      }
      return true;
    });

export const listTasksValidation = [
  projectIdParam,
  query("sprintId")
    .optional()
    .custom((value) => {
      if (value === undefined || value === null || value === "") {
        return true;
      }
      if (value === "backlog") {
        return true;
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(value))) {
        throw new Error("sprintId must be backlog or a UUID");
      }
      return true;
    }),
];

export const createTaskValidation = [
  projectIdParam,
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 500 })
    .withMessage("Title must be at most 500 characters"),
  body("description")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 50000 })
    .withMessage("Description is too long"),
  optionalTaskStatus,
  body("storyPoints")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === "") {
        return true;
      }
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        throw new Error("Story points must be 1–99 or empty");
      }
      return true;
    }),
  body("priority")
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage("Priority must be 0–1000"),
  optionalUuidOrEmpty("sprintId"),
  optionalUuidOrEmpty("assigneeId"),
  optionalUuidOrEmpty("parentTaskId"),
];

export const updateTaskValidation = [
  projectIdParam,
  taskIdParam,
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 500 })
    .withMessage("Title must be at most 500 characters"),
  body("description")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value !== "string") {
        throw new Error("Description must be a string or null");
      }
      if (value.length > 50000) {
        throw new Error("Description is too long");
      }
      return true;
    }),
  optionalTaskStatus,
  body("storyPoints")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null) {
        return true;
      }
      if (value === "" || value === undefined) {
        return true;
      }
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        throw new Error("Story points must be 1–99, null, or empty");
      }
      return true;
    }),
  body("priority")
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage("Priority must be 0–1000"),
  body("boardPosition")
    .optional()
    .isInt({ min: 0 })
    .withMessage("boardPosition must be a non-negative integer"),
  optionalUuidOrEmpty("sprintId"),
  optionalUuidOrEmpty("assigneeId"),
  optionalUuidOrEmpty("parentTaskId"),
];

export const deleteTaskValidation = [projectIdParam, taskIdParam];

export const reorderKanbanValidation = [
  projectIdParam,
  body("taskId").isUUID(4).withMessage("Invalid task id"),
  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .custom((value) => {
      const s = String(value).toLowerCase();
      const normalized = s === "in progress" ? "in_progress" : s;
      if (!["todo", "in_progress", "done"].includes(normalized)) {
        throw new Error("Status must be todo, in_progress, or done");
      }
      return true;
    }),
  body("orderedTaskIds")
    .isArray({ min: 1 })
    .withMessage("orderedTaskIds must be a non-empty array"),
  body("orderedTaskIds.*").isUUID(4).withMessage("Each task id must be a valid UUID"),
];
