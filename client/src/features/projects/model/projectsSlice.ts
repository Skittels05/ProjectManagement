import { createSlice } from "@reduxjs/toolkit";
import { createProject, fetchProjectById, fetchProjects } from "./projectsThunks";
import type { ProjectDto } from "./types";

type ProjectsState = {
  list: ProjectDto[];
  listLoading: boolean;
  listError: string | null;
  current: ProjectDto | null;
  currentLoading: boolean;
  currentError: string | null;
  createLoading: boolean;
  createError: string | null;
};

const initialState: ProjectsState = {
  list: [],
  listLoading: false,
  listError: null,
  current: null,
  currentLoading: false,
  currentError: null,
  createLoading: false,
  createError: null,
};

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    clearCurrentProject(state) {
      state.current = null;
      state.currentError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.listLoading = true;
        state.listError = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.listLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.listLoading = false;
        state.listError = action.payload ?? "Failed to load projects";
      })
      .addCase(fetchProjectById.pending, (state) => {
        state.currentLoading = true;
        state.currentError = null;
        state.current = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.currentLoading = false;
        state.current = action.payload;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.currentLoading = false;
        state.currentError = action.payload ?? "Failed to load project";
      })
      .addCase(createProject.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.createLoading = false;
        state.list = [action.payload, ...state.list.filter((p) => p.id !== action.payload.id)];
      })
      .addCase(createProject.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload ?? "Failed to create project";
      });
  },
});

export const { clearCurrentProject } = projectsSlice.actions;
export default projectsSlice.reducer;
