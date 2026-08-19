// types
import type { RequestHandler } from "express";
// others
import { authGuard } from "./auth.guard";

export const optionalAuthGuard: RequestHandler = (req, res, next) => {
  if (!req.headers.authorization) return next();
  authGuard(req, res, next);
};
