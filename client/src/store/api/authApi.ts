import { baseApi } from "./baseApi";
import type {
  AuthPayload,
  AuthUser,
  ChangePasswordBody,
  LoginCredentials,
  RegisterCredentials,
  UpdateProfileBody,
} from "../types/auth.types";
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
      async queryFn(_arg, api, _extraOptions, baseQuery) {
        const res = await baseQuery({ url: "/auth/refresh", method: "post" });
        if (res.error) {
          setAccessToken(null);
          api.dispatch(baseApi.util.resetApiState());
          return { error: res.error };
        }
        const data = res.data as AuthPayload;
        setAccessToken(data.accessToken);
        return { data };
      },
    }),
    updateProfile: build.mutation<{ user: AuthUser }, UpdateProfileBody>({
      query: (body) => ({ url: "/auth/me", method: "patch", data: body }),
    }),
    changePassword: build.mutation<{ message: string }, ChangePasswordBody>({
      query: (body) => ({ url: "/auth/me/password", method: "patch", data: body }),
    }),
    logout: build.mutation<void, void>({
      async queryFn(_arg, api, _extraOptions, baseQuery) {
        try {
          await baseQuery({ url: "/auth/logout", method: "post" });
        } finally {
          setAccessToken(null);
          api.dispatch(baseApi.util.resetApiState());
        }
        return { data: undefined };
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = authApi;
