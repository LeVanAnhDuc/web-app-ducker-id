// common
import { DatabaseError, NotFoundError } from "@/exceptions";
// others
import { Logger } from "@/libs/logger";
import { Repository } from "../repository.decorator";

@Repository()
class SampleRepository {
  readonly label = "sample";

  async ok(value: number): Promise<number> {
    return value * 2;
  }

  async readsThis(): Promise<string> {
    return this.label;
  }

  async failsUnexpectedly(): Promise<never> {
    throw new Error("connection reset");
  }

  async failsWithAppError(): Promise<never> {
    throw new NotFoundError({ key: "common:errors.notFound" });
  }

  async failsWithDuplicateKey(): Promise<never> {
    throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
  }

  async failsWithWriteConflict(): Promise<never> {
    throw Object.assign(new Error("WriteConflict"), {
      hasErrorLabel: (label: string) => label === "TransientTransactionError"
    });
  }

  buildFilter(id: string): { id: string } {
    return { id };
  }

  throwsSynchronously(): never {
    throw new Error("sync failure");
  }
}

describe("@Repository()", () => {
  let repo: SampleRepository;

  beforeEach(() => {
    jest.spyOn(Logger, "error").mockImplementation(() => undefined);
    repo = new SampleRepository();
  });

  it("resolves what the method resolves, with its arguments and `this`", async () => {
    await expect(repo.ok(21)).resolves.toBe(42);
    await expect(repo.readsThis()).resolves.toBe("sample");
  });

  it("turns an unexpected failure into a DatabaseError named <Class>.<method>", async () => {
    const error = await repo.failsUnexpectedly().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DatabaseError);
    expect((error as DatabaseError).operation).toBe(
      "SampleRepository.failsUnexpectedly"
    );
    expect((error as DatabaseError).cause).toEqual(
      new Error("connection reset")
    );
    expect(Logger.error).toHaveBeenCalledWith(
      "Database operation failed: SampleRepository.failsUnexpectedly",
      expect.any(Error)
    );
  });

  it("lets an AppError through unchanged", async () => {
    await expect(repo.failsWithAppError()).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("lets a duplicate key error through for handleError to answer 409", async () => {
    await expect(repo.failsWithDuplicateKey()).rejects.toMatchObject({
      code: 11000
    });
  });

  it("lets a transient transaction error through so withTransaction can retry", async () => {
    const error = await repo.failsWithWriteConflict().catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(DatabaseError);
    expect((error as Error).message).toBe("WriteConflict");
  });

  it("leaves a synchronous method alone", () => {
    expect(repo.buildFilter("a1")).toEqual({ id: "a1" });
    expect(() => repo.throwsSynchronously()).toThrow("sync failure");
    expect(Logger.error).not.toHaveBeenCalled();
  });
});
