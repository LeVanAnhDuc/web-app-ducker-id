// common
import { DatabaseError, AppError } from "@/exceptions";
// others
import { Logger } from "@/libs/logger";
import {
  isDuplicateKeyError,
  isMongooseValidationError,
  isMongooseCastError
} from "@/utils/mongo-errors";

export async function asyncDatabaseHandler<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    Logger.error(`Database operation failed: ${operation}`, error);

    if (
      error instanceof AppError ||
      isDuplicateKeyError(error) ||
      isMongooseValidationError(error) ||
      isMongooseCastError(error)
    ) {
      throw error;
    }

    throw new DatabaseError(operation, error);
  }
}
