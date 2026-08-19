// libs
import { randomUUID } from "crypto";
// types
import type { Request, Response, NextFunction } from "express";

const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_HEADER = "x-request-id";

export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const incomingId = req.headers[REQUEST_ID_HEADER];
  req.requestId =
    typeof incomingId === "string" && incomingId.length <= MAX_REQUEST_ID_LENGTH
      ? incomingId
      : randomUUID();

  res.setHeader(REQUEST_ID_HEADER, req.requestId);
  next();
};
