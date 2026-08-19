// types
import type { NextFunction, Request, Response } from "express";
// common
import { DatabaseError, ErrorResponse } from "@/common/exceptions";
// others
import { Logger } from "@/libs/logger";
import {
  isDuplicateKeyError,
  isMongooseValidationError,
  isMongooseCastError
} from "@/utils/mongo-errors";

type ControllerFn = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export const asyncHandler =
  (fn: ControllerFn) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

export async function asyncDatabaseHandler<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    Logger.error(`Database operation failed: ${operation}`, error);

    if (
      error instanceof ErrorResponse ||
      isDuplicateKeyError(error) ||
      isMongooseValidationError(error) ||
      isMongooseCastError(error)
    ) {
      throw error;
    }

    throw new DatabaseError(operation, error);
  }
}
