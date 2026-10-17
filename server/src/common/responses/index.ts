// types
import type { Response } from "express";
// common
import { STATUS_CODES } from "@/common/http";

interface SuccessResponsePattern<T> extends ResponsePattern<T> {
  status: number;
}

interface RequestLike {
  originalUrl: string;
  // Absent only when a response is sent before the i18n middleware ran.
  t?: TranslateFunction;
}

// Controllers pass an i18next key ("user:success.getAdminUsers"); the body
// carries its translation for the request's Accept-Language, the same way the
// error filter translates error keys. A literal with no catalogue entry (the
// health checks) comes back unchanged.
const translate = (req: RequestLike, message: string): string =>
  message && req.t ? req.t(message as I18n.Key) : message;

abstract class SuccessResponse<T> {
  private readonly status: number;
  private readonly message: string;
  private readonly data: T;

  constructor({ data, status, message }: Partial<SuccessResponsePattern<T>>) {
    this.status = status;
    this.message = message;
    this.data = data;
  }

  public send = (req: RequestLike, res: Response): void => {
    const body: ResponsePattern<T> = {
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      message: translate(req, this.message),
      data: this.data
    };
    res.status(this.status).json(body);
  };
}

export class OkSuccess<T> extends SuccessResponse<T> {
  constructor({
    message = "",
    status = STATUS_CODES.OK,
    data = undefined
  }: Partial<SuccessResponsePattern<T>>) {
    super({ message, status, data });
  }
}

export class CreatedSuccess<T> extends SuccessResponse<T> {
  constructor({
    message = "",
    status = STATUS_CODES.CREATED,
    data = undefined
  }: Partial<SuccessResponsePattern<T>>) {
    super({ message, status, data });
  }
}

export class NoContentSuccess extends SuccessResponse<undefined> {
  constructor() {
    super({ status: STATUS_CODES.NO_CONTENT });
  }

  public send = (_req: RequestLike, res: Response): void => {
    res.status(STATUS_CODES.NO_CONTENT).end();
  };
}
