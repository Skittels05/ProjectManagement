import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/model/authSlice";
import projectsReducer from "../features/projects/model/projectsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
