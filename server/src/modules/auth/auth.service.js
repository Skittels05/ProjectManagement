const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { env } = require("../../config/env");
const { RefreshToken, User } = require("../../models");
const { AppError } = require("../../utils/app-error");

function toUserDto(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isAdmin: user.isAdmin,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    env.accessSecret,
    { expiresIn: env.accessExpiresIn },
  );
}

function signRefreshToken(user) {
  return jwt.sign({ id: user.id }, env.refreshSecret, {
    expiresIn: env.refreshExpiresIn,
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildAuthResponse(user) {
  return {
    user: toUserDto(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

function getRefreshCookieConfig() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

async function persistRefreshToken(userId, refreshToken) {
  const decoded = jwt.verify(refreshToken, env.refreshSecret);

  await RefreshToken.create({
    userId,
    token: hashToken(refreshToken),
    expiresAt: new Date(decoded.exp * 1000),
  });
}

async function register({ fullName, email, password }) {
  const existingUser = await User.findOne({ where: { email } });

  if (existingUser) {
    throw new AppError("User with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ fullName, email, passwordHash });
  const authPayload = buildAuthResponse(user);
  await persistRefreshToken(user.id, authPayload.refreshToken);

  return authPayload;
}

async function login({ email, password }) {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const authPayload = buildAuthResponse(user);
  await persistRefreshToken(user.id, authPayload.refreshToken);

  return authPayload;
}

async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new AppError("Refresh token is missing", 401);
  }

  let payload;

  try {
    payload = jwt.verify(rawRefreshToken, env.refreshSecret);
  } catch (_error) {
    throw new AppError("Refresh token is invalid or expired", 401);
  }

  const tokenHash = hashToken(rawRefreshToken);
  const tokenRecord = await RefreshToken.findOne({
    where: {
      token: tokenHash,
      expiresAt: {
        [Op.gt]: new Date(),
      },
    },
    include: [{ model: User, as: "user" }],
  });

  if (!tokenRecord || tokenRecord.userId !== payload.id) {
    throw new AppError("Refresh token session not found", 401);
  }

  await tokenRecord.destroy();

  const authPayload = buildAuthResponse(tokenRecord.user);
  await persistRefreshToken(tokenRecord.user.id, authPayload.refreshToken);

  return authPayload;
}

async function logout(rawRefreshToken) {
  if (!rawRefreshToken) {
    return;
  }

  await RefreshToken.destroy({
    where: {
      token: hashToken(rawRefreshToken),
    },
  });
}

async function getCurrentUser(userId) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return toUserDto(user);
}

module.exports = {
  getRefreshCookieConfig,
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
};
