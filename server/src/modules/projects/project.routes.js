const { Router } = require("express");
const { asyncHandler } = require("../../utils/async-handler");
const { validationMiddleware } = require("../../middlewares/validation.middleware");
const { authMiddleware } = require("../../middlewares/auth.middleware");
const controller = require("./project.controller");
const {
  createProjectValidation,
  addMemberValidation,
  updateMemberRoleValidation,
  removeMemberValidation,
  getProjectByIdValidation,
} = require("./project.validation");

const projectsRouter = Router();

projectsRouter.use(authMiddleware);

projectsRouter.get("/", asyncHandler(controller.list));
projectsRouter.post(
  "/",
  createProjectValidation,
  validationMiddleware,
  asyncHandler(controller.create),
);
projectsRouter.post(
  "/:projectId/members",
  addMemberValidation,
  validationMiddleware,
  asyncHandler(controller.addMember),
);
projectsRouter.patch(
  "/:projectId/members/:userId",
  updateMemberRoleValidation,
  validationMiddleware,
  asyncHandler(controller.updateMemberRole),
);
projectsRouter.delete(
  "/:projectId/members/:userId",
  removeMemberValidation,
  validationMiddleware,
  asyncHandler(controller.removeMember),
);
projectsRouter.get(
  "/:projectId",
  getProjectByIdValidation,
  validationMiddleware,
  asyncHandler(controller.getById),
);

module.exports = { projectsRouter };
