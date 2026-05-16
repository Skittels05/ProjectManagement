import { baseApi } from "./baseApi";
import type {
  ActivityListDto,
  BurndownDto,
  ScatterPointDto,
  SprintStatsDto,
  TimeLogReportDto,
  VelocityDto,
} from "../types/analytics.types";

export type TimeLogReportFilters = {
  from?: string;
  to?: string;
  userId?: string;
  sprintId?: string;
};

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSprintStats: build.query<SprintStatsDto, { projectId: string; sprintId: string }>({
      query: ({ projectId, sprintId }) => ({
        url: `/projects/${projectId}/analytics/sprints/${sprintId}/stats`,
        method: "get",
      }),
    }),
    getSprintBurndown: build.query<BurndownDto, { projectId: string; sprintId: string }>({
      query: ({ projectId, sprintId }) => ({
        url: `/projects/${projectId}/analytics/sprints/${sprintId}/burndown`,
        method: "get",
      }),
    }),
    getSprintScatter: build.query<{ points: ScatterPointDto[] }, { projectId: string; sprintId: string }>({
      query: ({ projectId, sprintId }) => ({
        url: `/projects/${projectId}/analytics/sprints/${sprintId}/scatter`,
        method: "get",
      }),
    }),
    getTeamVelocity: build.query<VelocityDto, string>({
      query: (projectId) => ({
        url: `/projects/${projectId}/analytics/velocity`,
        method: "get",
      }),
    }),
    getTimeLogReport: build.query<TimeLogReportDto, { projectId: string; filters?: TimeLogReportFilters }>({
      query: ({ projectId, filters }) => ({
        url: `/projects/${projectId}/analytics/time-logs`,
        method: "get",
        params: filters,
      }),
    }),
    getActivityLog: build.query<ActivityListDto, { projectId: string; limit?: number; offset?: number }>({
      query: ({ projectId, limit = 50, offset = 0 }) => ({
        url: `/projects/${projectId}/activity`,
        method: "get",
        params: { limit, offset },
      }),
    }),
  }),
});

export const {
  useGetSprintStatsQuery,
  useGetSprintBurndownQuery,
  useGetSprintScatterQuery,
  useGetTeamVelocityQuery,
  useGetTimeLogReportQuery,
  useGetActivityLogQuery,
} = analyticsApi;
