import { AxiosError } from "axios";

type ApiErrorBody = {
  message?: string;
  errors?: Array<{ message: string }>;
};

const AUTH_ERROR_MESSAGES = new Set([
  "Invalid or expired access token",
  "Authorization token is missing",
  "Refresh token is missing",
  "Refresh token is invalid or expired",
  "Refresh token session not found",
]);

export function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const status = axiosError.response?.status;
  const fromBody =
    axiosError.response?.data?.errors?.[0]?.message ?? axiosError.response?.data?.message;

  if (status === 401 || (fromBody && AUTH_ERROR_MESSAGES.has(fromBody))) {
    return "Request failed";
  }

  if (fromBody) {
    return fromBody;
  }

  if (axiosError.message) {
    return axiosError.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Request failed";
}
