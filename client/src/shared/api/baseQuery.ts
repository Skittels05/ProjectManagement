import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AxiosError, AxiosRequestConfig } from "axios";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { getApiErrorMessage } from "../../services/apiError";
import { http } from "./http";

export type AxiosBaseQueryArgs = {
  url: string;
  method?: AxiosRequestConfig["method"];
  data?: unknown;
  params?: unknown;
};

function toFetchBaseQueryError(error: unknown): FetchBaseQueryError {
  const axiosError = error as AxiosError<{ message?: string }>;
  const status = axiosError.response?.status;
  const message = getApiErrorMessage(error);
  if (typeof status === "number") {
    return { status, data: message };
  }
  return { status: "FETCH_ERROR", error: message };
}

export const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, FetchBaseQueryError> =>
  async ({ url, method = "get", data, params }) => {
    try {
      const result = await http({ url, method, data, params });
      return { data: result.data };
    } catch (e) {
      return { error: toFetchBaseQueryError(e) };
    }
  };
