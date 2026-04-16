const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { AppError } = require("../utils/app-error");

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return next(new AppError("Authorization token is missing", 401));
  }

  try {
    req.user = jwt.verify(token, env.accessSecret);
    return next();
  } catch (_error) {
    return next(new AppError("Invalid or expired access token", 401));
  }
}

module.exports = { authMiddleware };
