// types
import type { NextFunction, Request, Response } from "express";
// common
import { STATUS_CODES } from "@/common/http";

interface SuccessBody<T> {
  status: number;
  message: string;
  data?: T;
}

export interface HandleOptions {
  status?: number;
  message?: I18n.Key;
}

type Handler = (req: Request, res: Response) => unknown;

export const sendSuccess = <T>(
  req: Request,
  res: Response,
  { status, message, data }: SuccessBody<T>
): void => {
  if (status === STATUS_CODES.NO_CONTENT) {
    res.status(status).end();
    return;
  }

  const body: ResponsePattern<T> = {
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    message,
    data
  };
  res.status(status).json(body);
};

// Controllers return the data; the route declares the status (200 unless
// stated) and the i18next key of the message, translated here per request.
export const handle =
  (
    handler: Handler,
    { status = STATUS_CODES.OK, message }: HandleOptions = {}
  ) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await handler(req, res);
      sendSuccess(req, res, {
        status,
        message: message && req.t ? req.t(message) : "",
        data
      });
    } catch (error) {
      next(error);
    }
  };
