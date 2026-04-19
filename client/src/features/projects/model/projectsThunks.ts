import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import { http } from "../../../shared/api/http";
import type { ProjectDto } from "./types";

type ApiError = {
  message?: string;
  errors?: Array<{ message: string }>;
};

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<ApiError>;
  const fromBody =
    axiosError.response?.data?.errors?.[0]?.message ?? axiosError.response?.data?.message;

  if (fromBody) {
    return fromBody;
  }

  if (axiosError.message) {
    return axiosError.message;
  }

  return "Request failed";
}

export const fetchProjects = createAsyncThunk<ProjectDto[], void, { rejectValue: string }>(
  "projects/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await http.get<{ projects: ProjectDto[] }>("/projects");
      return data.projects;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchProjectById = createAsyncThunk<
  ProjectDto,
  number,
  { rejectValue: string }
>("projects/fetchProjectById", async (id, { rejectWithValue }) => {
  try {
    const { data } = await http.get<{ project: ProjectDto }>(`/projects/${id}`);
    return data.project;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const createProject = createAsyncThunk<
  ProjectDto,
  { name: string; description?: string },
  { rejectValue: string }
>("projects/createProject", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await http.post<{ project: ProjectDto }>("/projects", payload);
    return data.project;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
