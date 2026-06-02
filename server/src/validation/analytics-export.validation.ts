import { body, param } from "express-validator";

const projectIdParam = param("projectId").isUUID(4).withMessage("Invalid project id");

const optionalUuidBody = (field: string) =>
  body(field)
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === "") return true;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(value))) {
        throw new Error(`${field} must be a UUID`);
      }
      return true;
    });

export const exportAnalyticsPdfValidation = [
  projectIdParam,
  body("report")
    .trim()
    .isIn(["sprint", "planning", "time", "activity"])
    .withMessage("report must be sprint, planning, time, or activity"),
  optionalUuidBody("sprintId"),
  optionalUuidBody("userId"),
  body("from")
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("from must be YYYY-MM-DD"),
  body("to")
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("to must be YYYY-MM-DD"),
  body("activityLimit").optional().isInt({ min: 1, max: 100 }).withMessage("activityLimit must be 1–100"),
];
