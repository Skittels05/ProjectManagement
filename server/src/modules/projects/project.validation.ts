import { body, param } from "express-validator";

const projectIdParam = param("projectId").isUUID(4).withMessage("Invalid project id");

const memberRoleBody = body("role")
  .trim()
  .notEmpty()
  .withMessage("Role is required")
  .isLength({ min: 1, max: 32 })
  .withMessage("Role must be between 1 and 32 characters")
  .custom((value) => {
    if (/^owner$/i.test(String(value).trim())) {
      throw new Error("The owner role cannot be assigned");
    }
    return true;
  });

export const createProjectValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 255 })
    .withMessage("Name must be at most 255 characters"),
  body("description")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 20000 })
    .withMessage("Description is too long"),
];

export const addMemberValidation = [
  projectIdParam,
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
  memberRoleBody,
];

export const updateMemberRoleValidation = [
  projectIdParam,
  param("userId").isUUID(4).withMessage("Invalid user id"),
  memberRoleBody,
];

export const removeMemberValidation = [
  projectIdParam,
  param("userId").isUUID(4).withMessage("Invalid user id"),
];

export const getProjectByIdValidation = [projectIdParam];

export const updateProjectValidation = [
  projectIdParam,
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Name must be at most 255 characters"),
  body("description")
    .optional({ values: "null" })
    .isString()
    .withMessage("Description must be a string")
    .isLength({ max: 20000 })
    .withMessage("Description is too long"),
  body("wipLimitTodo")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 999 })
    .withMessage("WIP limit must be 1–999 or empty"),
  body("wipLimitInProgress")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 999 })
    .withMessage("WIP limit must be 1–999 or empty"),
  body("wipLimitDone")
    .optional({ nullable: true })
    .isInt({ min: 1, max: 999 })
    .withMessage("WIP limit must be 1–999 or empty"),
  body().custom((_, { req }) => {
    const b = req.body as Record<string, unknown>;
    const keys = [
      "name",
      "description",
      "wipLimitTodo",
      "wipLimitInProgress",
      "wipLimitDone",
    ];
    if (!keys.some((k) => Object.prototype.hasOwnProperty.call(b, k))) {
      throw new Error("Provide at least one field to update");
    }
    return true;
  }),
];

export const deleteProjectValidation = [projectIdParam];
