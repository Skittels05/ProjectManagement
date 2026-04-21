import { http } from "../shared/api/http";
import { setAccessToken } from "../shared/lib/tokenStorage";
import type { AuthPayload, AuthUser, LoginCredentials, RegisterCredentials } from "../store/types/auth.types";

export async function register(credentials: RegisterCredentials): Promise<AuthPayload> {
  const { data } = await http.post<AuthPayload>("/auth/register", credentials);
  setAccessToken(data.accessToken);
  return data;
}

export async function login(credentials: LoginCredentials): Promise<AuthPayload> {
  const { data } = await http.post<AuthPayload>("/auth/login", credentials);
  setAccessToken(data.accessToken);
  return data;
}

export async function refreshTokens(): Promise<AuthPayload> {
  try {
    const { data } = await http.post<AuthPayload>("/auth/refresh");
    setAccessToken(data.accessToken);
    return data;
  } catch (error) {
    setAccessToken(null);
    throw error;
  }
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await http.get<{ user: AuthUser }>("/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await http.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}
