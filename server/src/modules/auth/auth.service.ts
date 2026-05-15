import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { CookieOptions } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Op, type Model } from "sequelize";
import { env } from "../../config/env";
import { RefreshToken, User } from "../../models";
import { AppError } from "../../utils/app-error";
import type { AuthTokenPayload } from "../../types/auth";

type UserAttrs = {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isBlocked: boolean;
  passwordHash: string;
};

function toUserDto(user: UserAttrs) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isAdmin: user.isAdmin,
  };
}

function signAccessToken(user: UserAttrs): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    env.accessSecret,
    { expiresIn: env.accessExpiresIn } as SignOptions,
  );
}

function signRefreshToken(user: Pick<UserAttrs, "id">): string {
  return jwt.sign({ id: user.id }, env.refreshSecret, {
    expiresIn: env.refreshExpiresIn,
  } as SignOptions);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildAuthResponse(user: UserAttrs) {
  return {
    user: toUserDto(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export function getRefreshCookieConfig(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

async function persistRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const decoded = jwt.verify(refreshToken, env.refreshSecret) as jwt.JwtPayload;
  if (decoded.exp == null) {
    throw new AppError("Invalid refresh token payload", 400);
  }

  await RefreshToken.create({
    userId,
    token: hashToken(refreshToken),
    expiresAt: new Date(decoded.exp * 1000),
  });
}

export async function register(body: {
  fullName: string;
  email: string;
  password: string;
}) {
  const { fullName, email, password } = body;
  const existingUser = await User.findOne({ where: { email } });

  if (existingUser) {
    throw new AppError("User with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await User.create({ fullName, email, passwordHash });
  const user = created.get({ plain: true }) as UserAttrs;
  const authPayload = buildAuthResponse(user);
  await persistRefreshToken(user.id, authPayload.refreshToken);

  return authPayload;
}

export async function login(body: { email: string; password: string }) {
  const { email, password } = body;
  const row = await User.findOne({ where: { email } });

  if (!row) {
    throw new AppError("Invalid email or password", 401);
  }

  const user = row.get({ plain: true }) as UserAttrs;

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.isBlocked) {
    throw new AppError("Account is disabled", 403);
  }

  const authPayload = buildAuthResponse(user);
  await persistRefreshToken(user.id, authPayload.refreshToken);

  return authPayload;
}

type RefreshRow = Model & {
  userId: string;
  user: Model & UserAttrs;
};

export async function refresh(rawRefreshToken: string | undefined) {
  if (!rawRefreshToken) {
    throw new AppError("Refresh token is missing", 401);
  }

  let payload: AuthTokenPayload;

  try {
    payload = jwt.verify(rawRefreshToken, env.refreshSecret) as AuthTokenPayload;
  } catch (_error) {
    throw new AppError("Refresh token is invalid or expired", 401);
  }

  const tokenHash = hashToken(rawRefreshToken);
  const tokenRecord = (await RefreshToken.findOne({
    where: {
      token: tokenHash,
      expiresAt: {
        [Op.gt]: new Date(),
      },
    },
    include: [{ model: User, as: "user" }],
  })) as RefreshRow | null;

  if (!tokenRecord || tokenRecord.userId !== payload.id) {
    throw new AppError("Refresh token session not found", 401);
  }

  const memberUser = tokenRecord.user.get({ plain: true }) as UserAttrs;

  if (memberUser.isBlocked) {
    throw new AppError("Account is disabled", 403);
  }

  await tokenRecord.destroy();

  const authPayload = buildAuthResponse(memberUser);
  await persistRefreshToken(memberUser.id, authPayload.refreshToken);

  return authPayload;
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  await RefreshToken.destroy({
    where: {
      token: hashToken(rawRefreshToken),
    },
  });
}

export async function getCurrentUser(userId: string) {
  const row = await User.findByPk(userId);

  if (!row) {
    throw new AppError("User not found", 404);
  }

  const user = row.get({ plain: true }) as UserAttrs;

  if (user.isBlocked) {
    throw new AppError("Account is disabled", 403);
  }

  return toUserDto(user);
}
