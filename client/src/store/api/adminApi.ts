import { baseApi } from "./baseApi";
import type { AdminUserDto, AdminUserListDto, AdminUsersQuery } from "../types/admin.types";

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminUsers: build.query<AdminUserListDto, AdminUsersQuery>({
      query: ({ search, sort, filter, limit, offset }) => ({
        url: "/admin/users",
        params: {
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(sort ? { sort } : {}),
          ...(filter ? { filter } : {}),
          ...(limit != null ? { limit } : {}),
          ...(offset != null ? { offset } : {}),
        },
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "AdminUsers" as const, id: "LIST" },
              ...result.items.map((u) => ({ type: "AdminUsers" as const, id: u.id })),
            ]
          : [{ type: "AdminUsers" as const, id: "LIST" }],
    }),
    updateAdminUser: build.mutation<
      AdminUserDto,
      { userId: string; isBlocked?: boolean; isAdmin?: boolean }
    >({
      query: ({ userId, isBlocked, isAdmin }) => ({
        url: `/admin/users/${userId}`,
        method: "patch",
        data: {
          ...(isBlocked !== undefined ? { isBlocked } : {}),
          ...(isAdmin !== undefined ? { isAdmin } : {}),
        },
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "AdminUsers", id: userId },
        { type: "AdminUsers", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetAdminUsersQuery, useUpdateAdminUserMutation } = adminApi;
