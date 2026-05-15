export type TaskCommentUserDto = {
  id: string;
  email: string;
  fullName: string;
};

export type TaskCommentDto = {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: TaskCommentUserDto | null;
};

export type TaskAttachmentDto = {
  id: string;
  taskId: string;
  uploadedBy: string;
  originalFilename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  uploader: TaskCommentUserDto | null;
};
