// libs
import mongoose from "mongoose";
// types
import type { AsyncLocalStorage } from "async_hooks";

type TransactionStore = { session?: { id: string } };

const storage = () =>
  (
    mongoose as unknown as {
      transactionAsyncLocalStorage?: AsyncLocalStorage<TransactionStore>;
    }
  ).transactionAsyncLocalStorage;

/**
 * Lets `@Transactional()` run without a server: enables the async-local
 * session store and replaces `connection.transaction` with what it does minus
 * MongoDB — run the callback with a fresh session in the store. Call it in
 * `beforeEach`; `jest.restoreAllMocks()` (or the returned spy's
 * `mockRestore()`) undoes it.
 *
 * `inTransaction()` tells whether code is running inside one, so a test can
 * assert that a repository call happened within the transaction.
 */
export const mockTransactions = () => {
  mongoose.set("transactionAsyncLocalStorage", true);
  let opened = 0;

  const transaction = jest
    .spyOn(mongoose.connection, "transaction")
    .mockImplementation(((fn: () => Promise<unknown>) => {
      opened += 1;
      return storage()!.run({ session: { id: `tx${opened}` } }, fn);
    }) as never);

  return { transaction };
};

export const inTransaction = (): boolean =>
  storage()?.getStore()?.session != null;
