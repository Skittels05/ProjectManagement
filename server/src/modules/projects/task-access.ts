import { ProjectMember, Task } from "../../models";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";

export async function assertProjectMember(projectId: string, userId: string) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  const row = await ProjectMember.findOne({ where: { projectId, userId } });
  if (!row) {
    throw new AppError("Project not found", 404);
  }
  return row;
}

export async function assertTaskInProject(projectId: string, taskId: string, userId: string) {
  if (!isUuidV4(projectId) || !isUuidV4(taskId)) {
    throw new AppError("Task not found", 404);
  }
  await assertProjectMember(projectId, userId);
  const task = await Task.findOne({ where: { id: taskId, projectId } });
  if (!task) {
    throw new AppError("Task not found", 404);
  }
  return task;
}
