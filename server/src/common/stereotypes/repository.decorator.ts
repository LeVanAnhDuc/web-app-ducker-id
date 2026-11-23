// common
import { AppError, DatabaseError } from "@/exceptions";
// others
import { Logger } from "@/libs/logger";
import {
  isDuplicateKeyError,
  isMongooseCastError,
  isMongooseValidationError
} from "@/utils/mongo-errors";

type RepositoryClass = { name: string; prototype: object };

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | null)?.then === "function";

/**
 * Logs a failed operation, then rethrows what `handleError` already knows how
 * to answer — an `AppError`, a duplicate key (409), a Mongoose validation or
 * cast error (400) — and turns anything else into a `DatabaseError` (500).
 */
const runDatabaseOperation = async <T>(
  operation: string,
  pending: PromiseLike<T>
): Promise<T> => {
  try {
    return await pending;
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
};

/**
 * Marks a class as a database repository: every method that returns a promise
 * runs through `runDatabaseOperation`, under the operation name
 * `<ClassName>.<method>`.
 *
 * A method that returns synchronously (a private filter builder, say) is left
 * alone, and so is a synchronous throw. Write repository methods `async` so
 * that every failure they can raise is a rejected promise.
 */
export const Repository =
  () =>
  (target: RepositoryClass): void => {
    const prototype = target.prototype;

    for (const name of Object.getOwnPropertyNames(prototype)) {
      if (name === "constructor") continue;

      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      if (typeof descriptor?.value !== "function") continue;

      const method = descriptor.value as (...args: unknown[]) => unknown;
      const operation = `${target.name}.${name}`;

      Object.defineProperty(prototype, name, {
        ...descriptor,
        value: function (this: unknown, ...args: unknown[]): unknown {
          const result = method.apply(this, args);
          return isPromiseLike(result)
            ? runDatabaseOperation(operation, result)
            : result;
        }
      });
    }
  };
