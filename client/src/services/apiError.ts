import { AxiosError } from "axios";

type ApiErrorBody = {
  message?: string;
  errors?: Array<{ message: string }>;
};

export function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const fromBody =
    axiosError.response?.data?.errors?.[0]?.message ?? axiosError.response?.data?.message;

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
