export type ProjectMemberDto = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
};

export type ProjectDto = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  role: string | null;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMemberDto[];
};

export type RemoveMemberResult = { left: true } | { project: ProjectDto };
