import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { AppError } from "../utils/app-error";

export function validationMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const result = validationResult(req);

  if (result.isEmpty()) {
    next();
    return;
  }

  next(new AppError("Validation failed", 400, result.array()));
}
