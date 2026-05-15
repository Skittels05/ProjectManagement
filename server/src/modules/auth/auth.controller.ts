import type { Response } from "express";
import type { Request } from "express";
import * as authService from "./auth.service";

export async function register(req: Request, res: Response): Promise<void> {
  const { refreshToken, ...payload } = await authService.register(req.body);

  res
    .cookie("refreshToken", refreshToken, authService.getRefreshCookieConfig())
    .status(201)
    .json(payload);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { refreshToken, ...payload } = await authService.login(req.body);

  res
    .cookie("refreshToken", refreshToken, authService.getRefreshCookieConfig())
    .status(200)
    .json(payload);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken, ...payload } = await authService.refresh(req.cookies.refreshToken as string | undefined);

  res
    .cookie("refreshToken", refreshToken, authService.getRefreshCookieConfig())
    .status(200)
    .json(payload);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.cookies.refreshToken as string | undefined);
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logged out successfully" });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getCurrentUser(req.user!.id);
  res.status(200).json({ user });
}
