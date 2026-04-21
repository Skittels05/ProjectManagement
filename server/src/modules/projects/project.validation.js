const { body, param } = require("express-validator");

const createProjectValidation = [
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

const addMemberValidation = [
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["member", "manager"])
    .withMessage("Role must be member or manager"),
];

const updateMemberRoleValidation = [
  param("userId").isInt({ min: 1 }).withMessage("Invalid user id"),
  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["owner", "manager", "member"])
    .withMessage("Invalid role"),
];

const removeMemberValidation = [param("userId").isInt({ min: 1 }).withMessage("Invalid user id")];

module.exports = {
  createProjectValidation,
  addMemberValidation,
  updateMemberRoleValidation,
  removeMemberValidation,
};
