import { createAsyncThunk } from "@reduxjs/toolkit";
import { getApiErrorMessage } from "../../services/apiError";
import * as projectsService from "../../services/projectsService";
import type { ProjectDto, ProjectRole, RemoveMemberResult } from "../types/projects.types";

export type { RemoveMemberResult } from "../types/projects.types";

export const fetchProjects = createAsyncThunk<ProjectDto[], void, { rejectValue: string }>(
  "projects/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      return await projectsService.fetchProjects();
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
);

export const fetchProjectById = createAsyncThunk<
  ProjectDto,
  string,
  { rejectValue: string }
>("projects/fetchProjectById", async (id, { rejectWithValue }) => {
  try {
    return await projectsService.fetchProjectById(id);
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error));
  }
});

export const createProject = createAsyncThunk<
  ProjectDto,
  { name: string; description?: string },
  { rejectValue: string }
>("projects/createProject", async (payload, { rejectWithValue }) => {
  try {
    return await projectsService.createProject(payload);
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error));
  }
});

export const addProjectMember = createAsyncThunk<
  ProjectDto,
  { projectId: string; email: string; role: "member" | "manager" },
  { rejectValue: string }
>("projects/addMember", async ({ projectId, email, role }, { rejectWithValue }) => {
  try {
    return await projectsService.addProjectMember(projectId, { email, role });
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error));
  }
});

export const updateProjectMemberRole = createAsyncThunk<
  ProjectDto,
  { projectId: string; userId: string; role: ProjectRole },
  { rejectValue: string }
>("projects/updateMemberRole", async ({ projectId, userId, role }, { rejectWithValue }) => {
  try {
    return await projectsService.updateProjectMemberRole(projectId, userId, role);
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error));
  }
});

export const removeProjectMember = createAsyncThunk<
  RemoveMemberResult,
  { projectId: string; userId: string },
  { rejectValue: string }
>("projects/removeMember", async ({ projectId, userId }, { rejectWithValue }) => {
  try {
    return await projectsService.removeProjectMember(projectId, userId);
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error));
  }
});
