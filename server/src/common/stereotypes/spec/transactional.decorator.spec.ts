// libs
import mongoose from "mongoose";
// types
import type { AsyncLocalStorage } from "async_hooks";
// common
import { ConfigError } from "@/exceptions";
// others
import { Transactional } from "../transactional.decorator";

type Store = { session?: { id: string } };

const storage = () =>
  (
    mongoose as unknown as {
      transactionAsyncLocalStorage?: AsyncLocalStorage<Store>;
    }
  ).transactionAsyncLocalStorage;

const currentSession = () => storage()?.getStore()?.session?.id;

class SampleService {
  readonly calls: Array<string | undefined> = [];

  @Transactional()
  async write(value: number): Promise<number> {
    this.calls.push(currentSession());
    return value + 1;
  }

  @Transactional()
  async writeTwice(): Promise<void> {
    await this.write(1);
    await this.write(2);
  }

  @Transactional()
  async fail(): Promise<never> {
    throw new Error("boom");
  }
}

describe("@Transactional()", () => {
  let transaction: jest.SpyInstance;
  let opened: number;

  beforeEach(() => {
    mongoose.set("transactionAsyncLocalStorage", true);
    opened = 0;
    // What Connection#transaction does, minus the server: run the callback
    // with a fresh session in the async-local store.
    transaction = jest
      .spyOn(mongoose.connection, "transaction")
      .mockImplementation(((fn: () => Promise<unknown>) => {
        opened += 1;
        return storage()!.run({ session: { id: `s${opened}` } }, fn);
      }) as never);
  });

  afterEach(() => {
    transaction.mockRestore();
  });

  it("runs the method inside a transaction and returns its result", async () => {
    const service = new SampleService();

    await expect(service.write(41)).resolves.toBe(42);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(service.calls).toEqual(["s1"]);
  });

  it("joins an outer transaction instead of opening another", async () => {
    const service = new SampleService();

    await service.writeTwice();

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(service.calls).toEqual(["s1", "s1"]);
  });

  it("rejects with what the method threw", async () => {
    await expect(new SampleService().fail()).rejects.toThrow("boom");
  });

  it("refuses to run when transactionAsyncLocalStorage is off", async () => {
    mongoose.set("transactionAsyncLocalStorage", false);
    const service = new SampleService();

    await expect(service.write(1)).rejects.toBeInstanceOf(ConfigError);
    expect(transaction).not.toHaveBeenCalled();
    expect(service.calls).toEqual([]);
  });
});
