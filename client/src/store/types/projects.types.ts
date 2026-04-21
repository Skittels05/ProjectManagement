export type ProjectRole = "owner" | "manager" | "member";

export type ProjectMemberDto = {
  userId: string;
  email: string;
  fullName: string;
  role: ProjectRole;
};

export type ProjectDto = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  role: ProjectRole | string | null;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMemberDto[];
};

export type RemoveMemberResult = { left: true } | { project: ProjectDto };
