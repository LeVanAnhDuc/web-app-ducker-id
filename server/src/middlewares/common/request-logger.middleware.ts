// types
import type { Request, Response, NextFunction } from "express";
// others
import { Logger } from "@/libs/logger";
import { redactSensitive } from "@/utils/redact";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  Logger.http(`${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    body: redactSensitive(req.body),
    query: redactSensitive(req.query),
    params: redactSensitive(req.params)
  });

  res.on("finish", () => {
    const duration_ms = Date.now() - startTime;
    Logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      requestId: req.requestId,
      duration_ms,
      statusCode: res.statusCode
    });
  });

  next();
};
