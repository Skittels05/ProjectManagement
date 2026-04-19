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

module.exports = {
  create,
  list,
  getById,
};
