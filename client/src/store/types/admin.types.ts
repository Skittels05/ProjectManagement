export type AdminUserDto = {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isBlocked: boolean;
};

export type AdminUserListDto = {
  items: AdminUserDto[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminUserSortOption = "name_asc" | "name_desc" | "email_asc" | "email_desc";
export type AdminUserFilterOption = "all" | "active" | "blocked" | "admins";

export type AdminUsersQuery = {
  search?: string;
  sort?: AdminUserSortOption;
  filter?: AdminUserFilterOption;
  limit?: number;
  offset?: number;
};
