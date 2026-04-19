import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import { http } from "../../../shared/api/http";
import { setAccessToken } from "../../../shared/lib/tokenStorage";

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  isAdmin: boolean;
};

type AuthPayload = {
  user: AuthUser;
  accessToken: string;
};

type Credentials = {
  email: string;
  password: string;
  fullName?: string;
};

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

export const registerUser = createAsyncThunk<
  AuthPayload,
  Credentials,
  { rejectValue: string }
>("auth/registerUser", async (credentials, { rejectWithValue }) => {
  try {
    const response = await http.post<AuthPayload>("/auth/register", credentials);
    setAccessToken(response.data.accessToken);
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const loginUser = createAsyncThunk<
  AuthPayload,
  Credentials,
  { rejectValue: string }
>("auth/loginUser", async (credentials, { rejectWithValue }) => {
  try {
    const response = await http.post<AuthPayload>("/auth/login", credentials);
    setAccessToken(response.data.accessToken);
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const refreshSession = createAsyncThunk<
  AuthPayload,
  void,
  { rejectValue: string }
>("auth/refreshSession", async (_, { rejectWithValue }) => {
  try {
    const response = await http.post<AuthPayload>("/auth/refresh");
    setAccessToken(response.data.accessToken);
    return response.data;
  } catch (error) {
    setAccessToken(null);
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: string }
>("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const response = await http.get<{ user: AuthUser }>("/auth/me");
    return response.data.user;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  try {
    await http.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
});

export const bootstrapAuth = createAsyncThunk<
  AuthPayload | null,
  void,
  { rejectValue: string }
>("auth/bootstrapAuth", async (_, { rejectWithValue }) => {
  try {
    const response = await http.post<AuthPayload>("/auth/refresh");
    setAccessToken(response.data.accessToken);
    return response.data;
  } catch (error) {
    setAccessToken(null);
    return rejectWithValue(getErrorMessage(error));
  }
});
