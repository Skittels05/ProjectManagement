import { createAsyncThunk } from "@reduxjs/toolkit";
import { getApiErrorMessage } from "../../services/apiError";
import * as authService from "../../services/authService";
import type { AuthPayload, AuthUser, LoginCredentials, RegisterCredentials } from "../types/auth.types";

export type { AuthUser } from "../types/auth.types";

export const registerUser = createAsyncThunk<
  AuthPayload,
  RegisterCredentials,
  { rejectValue: string }
>("auth/registerUser", async (credentials, { rejectWithValue }) => {
  try {
    return await authService.register(credentials);
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error));
  }
});

export const loginUser = createAsyncThunk<
  AuthPayload,
  LoginCredentials,
  { rejectValue: string }
>("auth/loginUser", async (credentials, { rejectWithValue }) => {
  try {
    return await authService.login(credentials);
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error));
  }
});

export const refreshSession = createAsyncThunk<AuthPayload, void, { rejectValue: string }>(
  "auth/refreshSession",
  async (_, { rejectWithValue }) => {
    try {
      return await authService.refreshTokens();
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
);

export const fetchCurrentUser = createAsyncThunk<AuthUser, void, { rejectValue: string }>(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      return await authService.fetchCurrentUser();
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  await authService.logout();
});

export const bootstrapAuth = createAsyncThunk<AuthPayload | null, void, { rejectValue: string }>(
  "auth/bootstrapAuth",
  async (_, { rejectWithValue }) => {
    try {
      return await authService.refreshTokens();
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
);
