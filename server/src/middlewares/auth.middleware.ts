import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import type { AuthTokenPayload } from "../types/auth";

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    next(new AppError("Authorization token is missing", 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.accessSecret) as AuthTokenPayload;
    req.user = payload;
    next();
  } catch (_error) {
    next(new AppError("Invalid or expired access token", 401));
  }
}
