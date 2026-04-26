import { baseApi } from "./baseApi";
import type { AuthPayload, LoginCredentials, RegisterCredentials } from "../types/auth.types";
import { setAccessToken } from "../../shared/lib/tokenStorage";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthPayload, LoginCredentials>({
      query: (body) => ({ url: "/auth/login", method: "post", data: body }),
      transformResponse: (response: AuthPayload) => {
        setAccessToken(response.accessToken);
        return response;
      },
    }),
    register: build.mutation<AuthPayload, RegisterCredentials>({
      query: (body) => ({ url: "/auth/register", method: "post", data: body }),
      transformResponse: (response: AuthPayload) => {
        setAccessToken(response.accessToken);
        return response;
      },
    }),
    refresh: build.mutation<AuthPayload, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const res = await baseQuery({ url: "/auth/refresh", method: "post" });
        if (res.error) {
          setAccessToken(null);
          return { error: res.error };
        }
        const data = res.data as AuthPayload;
        setAccessToken(data.accessToken);
        return { data };
      },
    }),
    logout: build.mutation<void, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        try {
          await baseQuery({ url: "/auth/logout", method: "post" });
        } finally {
          setAccessToken(null);
        }
        return { data: undefined };
      },
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useRefreshMutation, useLogoutMutation } = authApi;
