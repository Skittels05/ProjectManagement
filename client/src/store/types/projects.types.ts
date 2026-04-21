export type ProjectRole = "owner" | "manager" | "member";

export type ProjectMemberDto = {
  userId: number;
  email: string;
  fullName: string;
  role: ProjectRole;
};

export type ProjectDto = {
  id: number;
  name: string;
  description: string | null;
  createdBy: number;
  role: ProjectRole | string | null;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMemberDto[];
};

export type RemoveMemberResult = { left: true } | { project: ProjectDto };
