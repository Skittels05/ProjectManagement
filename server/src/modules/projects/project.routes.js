const { Router } = require("express");
const { asyncHandler } = require("../../utils/async-handler");
const { validationMiddleware } = require("../../middlewares/validation.middleware");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const controller = require("./project.controller");
const { createProjectValidation } = require("./project.validation");

const projectsRouter = Router();

projectsRouter.use(authMiddleware);

projectsRouter.get("/", asyncHandler(controller.list));
projectsRouter.post(
  "/",
  createProjectValidation,
  validationMiddleware,
  asyncHandler(controller.create),
);
projectsRouter.get("/:projectId", asyncHandler(controller.getById));

module.exports = { projectsRouter };
