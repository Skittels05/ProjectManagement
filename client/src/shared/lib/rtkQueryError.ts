import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === "object" && error != null && "status" in error;
}

const AUTH_ERROR_MESSAGES = new Set([
  "Invalid or expired access token",
  "Authorization token is missing",
  "Refresh token is missing",
  "Refresh token is invalid or expired",
  "Refresh token session not found",
]);

export function getRtkQueryErrorMessage(error: unknown): string {
  if (error == null) {
    return "Request failed";
  }
  if (isFetchBaseQueryError(error)) {
    if (error.status === 401) {
      return "Request failed";
    }
    if (typeof error.data === "string") {
      if (AUTH_ERROR_MESSAGES.has(error.data)) {
        return "Request failed";
      }
      return error.data;
    }
    if (
      error.status === "FETCH_ERROR" ||
      error.status === "PARSING_ERROR" ||
      error.status === "TIMEOUT_ERROR"
    ) {
      return error.error;
    }
  }
  const serialized = error as SerializedError;
  if (serialized?.message) {
    return serialized.message;
  }
  return "Request failed";
}
