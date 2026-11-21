// libs
import { StatusCodes } from "http-status-codes";
// types
import type { Request, Response } from "express";

interface SuccessBody<T> {
  status: number;
  message: string;
  data?: T;
}

export const sendSuccess = <T>(
  req: Request,
  res: Response,
  { status, message, data }: SuccessBody<T>
): void => {
  if (status === StatusCodes.NO_CONTENT) {
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
