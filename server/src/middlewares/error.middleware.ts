import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const err = error as AppError & { message: string };
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    message: err.message || "Internal server error",
    errors: err.details || undefined,
  });
}
