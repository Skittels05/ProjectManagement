export type SprintStatsDto = {
  sprint: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    status: string;
  };
  totalTasks: number;
  byStatus: { todo: number; in_progress: number; done: number };
  committedStoryPoints: number;
  completedStoryPoints: number;
  completionPercent: number;
  totalLoggedMinutes: number;
  daysTotal: number;
  daysElapsed: number;
};

export type BurndownPoint = { date: string; ideal: number; actual: number };

export type BurndownDto = {
  sprint: { id: string; name: string; startsAt: string; endsAt: string };
  committedStoryPoints: number;
  points: BurndownPoint[];
};

export type ScatterPointDto = {
  taskId: string;
  title: string;
  storyPoints: number;
  totalMinutes: number;
  assignee: { id: string; fullName: string } | null;
};

export type VelocityDto = {
  sprints: {
    sprintId: string;
    name: string;
    endsAt: string;
    completedStoryPoints: number;
  }[];
  averageCompletedStoryPoints: number | null;
};

export type TimeLogReportRowDto = {
  id: string;
  taskId: string;
  taskTitle: string;
  sprintId: string | null;
  sprintName: string | null;
  userId: string;
  userName: string;
  minutes: number;
  note: string | null;
  loggedAt: string;
};

export type TimeLogReportDto = {
  items: TimeLogReportRowDto[];
  totalMinutes: number;
  summaryByUser: { userId: string; userName: string; minutes: number }[];
};

export type ActivityItemDto = {
  id: string;
  projectId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { id: string; email: string; fullName: string } | null;
};

export type ActivityListDto = {
  items: ActivityItemDto[];
  total: number;
  limit: number;
  offset: number;
};
