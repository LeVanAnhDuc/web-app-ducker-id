// types
import type { Response } from "express";
import type { ResponseMeta } from "@/types/common";
// common
import { STATUS_CODES } from "@/common/http";

interface SuccessResponsePattern<T> extends ResponsePattern<T> {
  status: number;
}

interface RequestLike {
  originalUrl: string;
}

abstract class SuccessResponse<T> {
  private readonly status: number;
  private readonly message: string;
  private readonly data: T;
  private readonly meta?: ResponseMeta;

  constructor({
    data,
    status,
    message,
    meta
  }: Partial<SuccessResponsePattern<T>>) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  public send = (req: RequestLike, res: Response): void => {
    const body: ResponsePattern<T> = {
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      message: this.message,
      data: this.data
    };
    if (this.meta) body.meta = this.meta;
    res.status(this.status).json(body);
  };
}

export class OkSuccess<T> extends SuccessResponse<T> {
  constructor({
    message = "",
    status = STATUS_CODES.OK,
    data = undefined,
    meta
  }: Partial<SuccessResponsePattern<T>>) {
    super({ message, status, data, meta });
  }
}

export class CreatedSuccess<T> extends SuccessResponse<T> {
  constructor({
    message = "",
    status = STATUS_CODES.CREATED,
    data = undefined,
    meta
  }: Partial<SuccessResponsePattern<T>>) {
    super({ message, status, data, meta });
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
