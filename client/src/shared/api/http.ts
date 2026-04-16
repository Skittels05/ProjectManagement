import axios from "axios";
import { env } from "../config/env";
import { getAccessToken } from "../lib/tokenStorage";

export const http = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
