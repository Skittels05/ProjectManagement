import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === "object" && error != null && "status" in error;
}

export function getRtkQueryErrorMessage(error: unknown): string {
  if (error == null) {
    return "Request failed";
  }
  if (isFetchBaseQueryError(error)) {
    if (typeof error.data === "string") {
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
