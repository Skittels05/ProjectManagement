import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { adminMiddleware } from "../../middlewares/admin.middleware";
import { validationMiddleware } from "../../middlewares/validation.middleware";
import * as controller from "./admin.controller";
import { listUsersValidation, updateUserValidation } from "./admin.validation";

export const adminRouter = Router();

adminRouter.use(authMiddleware, adminMiddleware);

adminRouter.get("/users", listUsersValidation, validationMiddleware, asyncHandler(controller.listUsers));

adminRouter.patch(
  "/users/:userId",
  updateUserValidation,
  validationMiddleware,
  asyncHandler(controller.updateUser),
);
