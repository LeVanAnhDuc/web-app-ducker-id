// libs
import { randomUUID } from "crypto";
// types
import type { Request, Response, NextFunction } from "express";

const REQUEST_ID_HEADER = "x-request-id";

// The id is always minted here, never taken from the caller: nothing upstream
// sends one today, and an id the caller chooses can collide with or impersonate
// another request in the logs.
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  req.requestId = randomUUID();

  res.setHeader(REQUEST_ID_HEADER, req.requestId);
  next();
};
