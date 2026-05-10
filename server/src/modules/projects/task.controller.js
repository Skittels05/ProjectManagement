const taskService = require("./task.service");

async function list(req, res) {
  const tasks = await taskService.listTasks(req.params.projectId, req.user.id, req.query);
  res.status(200).json({ tasks });
}

async function create(req, res) {
  const task = await taskService.createTask(req.user.id, req.params.projectId, req.body);
  res.status(201).json({ task });
}

async function update(req, res) {
  const task = await taskService.updateTask(req.user.id, req.params.projectId, req.params.taskId, req.body);
  res.status(200).json({ task });
}

async function remove(req, res) {
  await taskService.deleteTask(req.user.id, req.params.projectId, req.params.taskId);
  res.status(204).send();
}

module.exports = {
  list,
  create,
  update,
  remove,
};
