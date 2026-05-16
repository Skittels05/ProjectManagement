import { param, query } from "express-validator";

const projectIdParam = param("projectId").isUUID(4).withMessage("Invalid project id");
const sprintIdParam = param("sprintId").isUUID(4).withMessage("Invalid sprint id");

const optionalDateQuery = (field: string) =>
  query(field)
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${field} must be YYYY-MM-DD`);

const optionalUuidQuery = (field: string) =>
  query(field).optional().trim().isUUID(4).withMessage(`Invalid ${field}`);

export const sprintAnalyticsValidation = [projectIdParam, sprintIdParam];

export const timeLogReportValidation = [
  projectIdParam,
  optionalDateQuery("from"),
  optionalDateQuery("to"),
  optionalUuidQuery("userId"),
  optionalUuidQuery("sprintId"),
];

export const projectAnalyticsValidation = [projectIdParam];

export const listActivityValidation = [
  projectIdParam,
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("offset").optional().isInt({ min: 0 }).toInt(),
];
