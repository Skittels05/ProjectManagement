const sprintService = require("./sprint.service");

async function list(req, res) {
  const sprints = await sprintService.listSprints(req.params.projectId, req.user.id);
  res.status(200).json({ sprints });
}

async function create(req, res) {
  const sprint = await sprintService.createSprint(req.user.id, req.params.projectId, req.body);
  res.status(201).json({ sprint });
}

async function update(req, res) {
  const sprint = await sprintService.updateSprint(
    req.user.id,
    req.params.projectId,
    req.params.sprintId,
    req.body,
  );
  res.status(200).json({ sprint });
}

async function remove(req, res) {
  await sprintService.deleteSprint(req.user.id, req.params.projectId, req.params.sprintId);
  res.status(204).send();
}

module.exports = {
  list,
  create,
  update,
  remove,
};
