import { http } from "../../shared/api/http";
import { baseApi } from "./baseApi";
import type { TaskAttachmentDto, TaskCommentDto } from "../types/taskEngagement.types";

type TaskRef = { projectId: string; taskId: string };

function engagementTag({ projectId, taskId }: TaskRef) {
  return { type: "TaskEngagement" as const, id: `${projectId}-${taskId}` };
}

export const taskEngagementApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTaskComments: build.query<TaskCommentDto[], TaskRef>({
      query: ({ projectId, taskId }) => ({
        url: `/projects/${projectId}/tasks/${taskId}/comments`,
        method: "get",
      }),
      transformResponse: (response: { comments: TaskCommentDto[] }) => response.comments,
      providesTags: (_r, _e, arg) => [engagementTag(arg)],
    }),
    createTaskComment: build.mutation<TaskCommentDto, TaskRef & { body: string }>({
      query: ({ projectId, taskId, body }) => ({
        url: `/projects/${projectId}/tasks/${taskId}/comments`,
        method: "post",
        data: { body },
      }),
      transformResponse: (response: { comment: TaskCommentDto }) => response.comment,
      invalidatesTags: (_r, _e, arg) => [engagementTag(arg)],
    }),
    updateTaskComment: build.mutation<
      TaskCommentDto,
      TaskRef & { commentId: string; body: string }
    >({
      query: ({ projectId, taskId, commentId, body }) => ({
        url: `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        method: "patch",
        data: { body },
      }),
      transformResponse: (response: { comment: TaskCommentDto }) => response.comment,
      invalidatesTags: (_r, _e, arg) => [engagementTag(arg)],
    }),
    deleteTaskComment: build.mutation<void, TaskRef & { commentId: string }>({
      query: ({ projectId, taskId, commentId }) => ({
        url: `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        method: "delete",
      }),
      invalidatesTags: (_r, _e, arg) => [engagementTag(arg)],
    }),
    getTaskAttachments: build.query<TaskAttachmentDto[], TaskRef>({
      query: ({ projectId, taskId }) => ({
        url: `/projects/${projectId}/tasks/${taskId}/attachments`,
        method: "get",
      }),
      transformResponse: (response: { attachments: TaskAttachmentDto[] }) => response.attachments,
      providesTags: (_r, _e, arg) => [engagementTag(arg)],
    }),
    uploadTaskAttachment: build.mutation<TaskAttachmentDto, TaskRef & { file: File }>({
      query: ({ projectId, taskId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/projects/${projectId}/tasks/${taskId}/attachments`,
          method: "post",
          data: formData,
        };
      },
      transformResponse: (response: { attachment: TaskAttachmentDto }) => response.attachment,
      invalidatesTags: (_r, _e, arg) => [engagementTag(arg)],
    }),
    deleteTaskAttachment: build.mutation<void, TaskRef & { attachmentId: string }>({
      query: ({ projectId, taskId, attachmentId }) => ({
        url: `/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
        method: "delete",
      }),
      invalidatesTags: (_r, _e, arg) => [engagementTag(arg)],
    }),
  }),
});

export const {
  useGetTaskCommentsQuery,
  useCreateTaskCommentMutation,
  useUpdateTaskCommentMutation,
  useDeleteTaskCommentMutation,
  useGetTaskAttachmentsQuery,
  useUploadTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,
} = taskEngagementApi;

export function taskAttachmentFileUrl(projectId: string, taskId: string, attachmentId: string): string {
  return `/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/file`;
}

export async function fetchTaskAttachmentBlob(
  projectId: string,
  taskId: string,
  attachmentId: string,
): Promise<Blob> {
  const response = await http.get(taskAttachmentFileUrl(projectId, taskId, attachmentId), {
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function downloadTaskAttachment(
  projectId: string,
  taskId: string,
  attachmentId: string,
  filename: string,
): Promise<void> {
  const blob = await fetchTaskAttachmentBlob(projectId, taskId, attachmentId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
