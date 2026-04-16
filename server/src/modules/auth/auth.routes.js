const { Router } = require("express");
const { asyncHandler } = require("../../utils/async-handler");
const { validationMiddleware } = require("../../middlewares/validation.middleware");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const controller = require("./auth.controller");
const { registerValidation, loginValidation } = require("./auth.validation");

const authRouter = Router();

authRouter.post(
  "/register",
  registerValidation,
  validationMiddleware,
  asyncHandler(controller.register),
);

authRouter.post(
  "/login",
  loginValidation,
  validationMiddleware,
  asyncHandler(controller.login),
);

authRouter.post("/refresh", asyncHandler(controller.refresh));
authRouter.post("/logout", asyncHandler(controller.logout));
authRouter.get("/me", authMiddleware, asyncHandler(controller.me));

module.exports = { authRouter };
