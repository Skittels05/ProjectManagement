import { body, param, query } from "express-validator";

const userIdParam = param("userId").isUUID(4).withMessage("Invalid user id");

export const listUsersValidation = [
  query("search").optional().isString().isLength({ max: 200 }).withMessage("Search is too long"),
  query("sort")
    .optional()
    .isIn(["name_asc", "name_desc", "email_asc", "email_desc"])
    .withMessage("Invalid sort"),
  query("filter")
    .optional()
    .isIn(["all", "active", "blocked", "admins"])
    .withMessage("Invalid filter"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Invalid limit"),
  query("offset").optional().isInt({ min: 0 }).withMessage("Invalid offset"),
];

export const updateUserValidation = [
  userIdParam,
  body("isBlocked").optional().isBoolean().withMessage("isBlocked must be a boolean"),
  body("isAdmin").optional().isBoolean().withMessage("isAdmin must be a boolean"),
  body().custom((_value, { req }) => {
    if (req.body?.isBlocked === undefined && req.body?.isAdmin === undefined) {
      throw new Error("Provide isBlocked and/or isAdmin");
    }
    return true;
  }),
];
