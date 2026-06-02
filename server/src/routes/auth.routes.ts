import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { validationMiddleware } from "../middlewares/validation.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as controller from "../controllers/auth.controller";
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
} from "../validation/auth.validation";

export const authRouter = Router();

authRouter.post("/register", registerValidation, validationMiddleware, asyncHandler(controller.register));

authRouter.post("/login", loginValidation, validationMiddleware, asyncHandler(controller.login));

authRouter.post("/refresh", asyncHandler(controller.refresh));
authRouter.post("/logout", asyncHandler(controller.logout));
authRouter.get("/me", authMiddleware, asyncHandler(controller.me));
authRouter.patch(
  "/me",
  authMiddleware,
  updateProfileValidation,
  validationMiddleware,
  asyncHandler(controller.updateProfile),
);
authRouter.patch(
  "/me/password",
  authMiddleware,
  changePasswordValidation,
  validationMiddleware,
  asyncHandler(controller.changePassword),
);
