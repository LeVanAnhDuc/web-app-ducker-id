// libs
import mongoose from "mongoose";
// types
import type { AsyncLocalStorage } from "async_hooks";
import type { ClientSession } from "mongoose";
// common
import { ConfigError } from "@/exceptions";

/**
 * Set by `mongoose.set("transactionAsyncLocalStorage", true)` and read by every
 * query, aggregate, save, insertMany and bulkWrite; the typings declare only
 * the option, not the storage it creates.
 */
const transactionStorage = () =>
  (
    mongoose as unknown as {
      transactionAsyncLocalStorage?: AsyncLocalStorage<{
        session?: ClientSession;
      }>;
    }
  ).transactionAsyncLocalStorage;

/**
 * Runs the method in a MongoDB transaction. Every Mongoose operation it starts
 * — down through services and repositories of other modules — joins the
 * transaction on its own, so no `session` is passed anywhere.
 *
 * - Called inside another transaction, the method joins it instead of
 *   opening a second one.
 * - `withTransaction` re-runs the method on a transient error (a write
 *   conflict, an unknown commit result). Keep work that must not repeat — Redis,
 *   mail, a token handed out — outside the decorated method.
 * - Refuses to run when `transactionAsyncLocalStorage` is off: the queries
 *   would quietly run outside the transaction.
 */
export const Transactional =
  (): MethodDecorator =>
  (_target, _method, descriptor: PropertyDescriptor): void => {
    const method = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const storage = transactionStorage();
      if (!storage) {
        throw new ConfigError(
          '@Transactional() needs mongoose.set("transactionAsyncLocalStorage", true)'
        );
      }

      if (storage.getStore()?.session) return method.apply(this, args);

      return mongoose.connection.transaction(async () =>
        method.apply(this, args)
      );
    };
  };
