import { body, param } from "express-validator";

const projectIdParam = param("projectId").isUUID(4).withMessage("Invalid project id");

const sprintIdParam = param("sprintId").isUUID(4).withMessage("Invalid sprint id");

const dateOnly = (field: string, label: string) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${label} must be YYYY-MM-DD`);

const optionalDateOnly = (field: string, label: string) =>
  body(field)
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${label} must be YYYY-MM-DD`);

const optionalStatus = body("status")
  .optional()
  .trim()
  .isIn(["planned", "active", "completed"])
  .withMessage("Status must be planned, active, or completed");

export const listSprintsValidation = [projectIdParam];

export const createSprintValidation = [
  projectIdParam,
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 255 })
    .withMessage("Name must be at most 255 characters"),
  body("goal")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Goal must be a string")
    .isLength({ max: 20000 })
    .withMessage("Goal is too long"),
  dateOnly("startsAt", "Start date"),
  dateOnly("endsAt", "End date"),
  optionalStatus,
];

export const updateSprintValidation = [
  projectIdParam,
  sprintIdParam,
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Name must be at most 255 characters"),
  body("goal")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value !== "string") {
        throw new Error("Goal must be a string or null");
      }
      if (value.length > 20000) {
        throw new Error("Goal is too long");
      }
      return true;
    }),
  optionalDateOnly("startsAt", "Start date"),
  optionalDateOnly("endsAt", "End date"),
  optionalStatus,
];

export const deleteSprintValidation = [projectIdParam, sprintIdParam];
