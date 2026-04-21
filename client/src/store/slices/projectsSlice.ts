import { createSlice } from "@reduxjs/toolkit";
import {
  addProjectMember,
  createProject,
  createSprint,
  deleteSprint,
  fetchProjectById,
  fetchProjects,
  fetchSprints,
  removeProjectMember,
  updateProjectMemberRole,
  updateSprint,
} from "../thunks/projectsThunks";
import type { ProjectDto } from "../types/projects.types";
import type { SprintDto } from "../types/sprints.types";

type ProjectsState = {
  list: ProjectDto[];
  listLoading: boolean;
  listError: string | null;
  current: ProjectDto | null;
  currentLoading: boolean;
  currentError: string | null;
  createLoading: boolean;
  createError: string | null;
  sprints: SprintDto[];
  sprintsLoading: boolean;
  sprintsError: string | null;
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
  sprints: [],
  sprintsLoading: false,
  sprintsError: null,
};

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    clearCurrentProject(state) {
      state.current = null;
      state.currentError = null;
      state.sprints = [];
      state.sprintsLoading = false;
      state.sprintsError = null;
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
      .addCase(fetchProjectById.pending, (state, action) => {
        state.currentLoading = true;
        state.currentError = null;
        const loadingId = action.meta.arg;
        if (state.current?.id !== loadingId) {
          state.current = null;
          state.sprints = [];
          state.sprintsError = null;
          state.sprintsLoading = false;
        }
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
      })
      .addCase(addProjectMember.fulfilled, (state, action) => {
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
      })
      .addCase(updateProjectMemberRole.fulfilled, (state, action) => {
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
      })
      .addCase(removeProjectMember.fulfilled, (state, action) => {
        if ("project" in action.payload && state.current?.id === action.payload.project.id) {
          state.current = action.payload.project;
        }
      })
      .addCase(fetchSprints.pending, (state) => {
        state.sprintsLoading = true;
        state.sprintsError = null;
      })
      .addCase(fetchSprints.fulfilled, (state, action) => {
        state.sprintsLoading = false;
        state.sprints = action.payload;
      })
      .addCase(fetchSprints.rejected, (state, action) => {
        state.sprintsLoading = false;
        state.sprintsError = action.payload ?? "Failed to load sprints";
      })
      .addCase(createSprint.fulfilled, (state, action) => {
        const sprint = action.payload;
        if (state.current?.id === sprint.projectId) {
          state.sprints = [sprint, ...state.sprints.filter((s) => s.id !== sprint.id)];
          state.sprints.sort(
            (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
          );
        }
      })
      .addCase(updateSprint.fulfilled, (state, action) => {
        const sprint = action.payload;
        if (state.current?.id === sprint.projectId) {
          state.sprints = state.sprints.map((s) => (s.id === sprint.id ? sprint : s));
          state.sprints.sort(
            (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
          );
        }
      })
      .addCase(deleteSprint.fulfilled, (state, action) => {
        const { sprintId } = action.payload;
        state.sprints = state.sprints.filter((s) => s.id !== sprintId);
      });
  },
});

export const { clearCurrentProject } = projectsSlice.actions;
export default projectsSlice.reducer;
