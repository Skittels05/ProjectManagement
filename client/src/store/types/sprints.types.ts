export type SprintStatus = "planned" | "active" | "completed";

export type SprintDto = {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startsAt: string;
  endsAt: string;
  status: SprintStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateSprintBody = {
  name: string;
  goal?: string | null;
  startsAt: string;
  endsAt: string;
  status?: SprintStatus;
};

export type UpdateSprintBody = Partial<{
  name: string;
  goal: string | null;
  startsAt: string;
  endsAt: string;
  status: SprintStatus;
}>;
