export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  isAdmin: boolean;
};

export type AuthPayload = {
  user: AuthUser;
  accessToken: string;
};

export type RegisterCredentials = {
  fullName: string;
  email: string;
  password: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};
