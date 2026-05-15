import { body } from "express-validator";

export const registerValidation = [
  body("fullName")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Full name must be between 2 and 80 characters"),
  body("email").trim().isEmail().withMessage("Email must be valid"),
  body("password")
    .isLength({ min: 6, max: 64 })
    .withMessage("Password must be between 6 and 64 characters"),
];

export const loginValidation = [
  body("email").trim().isEmail().withMessage("Email must be valid"),
  body("password")
    .isLength({ min: 6, max: 64 })
    .withMessage("Password must be between 6 and 64 characters"),
];
