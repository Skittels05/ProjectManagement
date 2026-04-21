const projectService = require("./project.service");

async function create(req, res) {
  const project = await projectService.createProject(req.user.id, req.body);
  res.status(201).json({ project });
}

async function list(req, res) {
  const projects = await projectService.listProjectsForUser(req.user.id);
  res.status(200).json({ projects });
}

async function getById(req, res) {
  const project = await projectService.getProjectForUser(req.params.projectId, req.user.id);
  res.status(200).json({ project });
}

async function addMember(req, res) {
  const project = await projectService.addProjectMember(req.user.id, req.params.projectId, req.body);
  res.status(201).json({ project });
}

async function updateMemberRole(req, res) {
  const project = await projectService.updateProjectMemberRole(
    req.user.id,
    req.params.projectId,
    req.params.userId,
    req.body,
  );
  res.status(200).json({ project });
}

async function removeMember(req, res) {
  const result = await projectService.removeProjectMember(
    req.user.id,
    req.params.projectId,
    req.params.userId,
  );

  if (result.left) {
    res.status(200).json({ left: true });
    return;
  }

  res.status(200).json({ project: result });
}

module.exports = {
  create,
  list,
  getById,
  addMember,
  updateMemberRole,
  removeMember,
};
