import { createSlice } from "@reduxjs/toolkit";
import { authApi } from "../api/authApi";
import type { AuthUser } from "../types/auth.types";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  initialized: boolean;
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addMatcher(authApi.endpoints.refresh.matchFulfilled, (state, action) => {
        state.initialized = true;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addMatcher(authApi.endpoints.refresh.matchRejected, (state) => {
        state.initialized = true;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
      })
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.initialized = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addMatcher(authApi.endpoints.register.matchFulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.initialized = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
      });
  },
});

export default authSlice.reducer;
