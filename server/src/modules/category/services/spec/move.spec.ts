// libs
const endSession = jest.fn();
const withTransaction = jest.fn();
const startSession = jest.fn();

jest.mock("mongoose", () => ({
  __esModule: true,
  default: { startSession }
}));

// service
import { CategoryService } from "../";
// common
import { NotFoundError } from "@/common/exceptions";
// others
import {
  CATEGORY_ID,
  OTHER_ID,
  THIRD_ID,
  categoryDoc,
  makeDeps
} from "./make-deps";

const session = { withTransaction, endSession };

describe("CategoryService.move", () => {
  const setup = () => {
    const ctx = makeDeps();
    ctx.categoryRepo.findAll.mockResolvedValue([
      categoryDoc(OTHER_ID, "A", "a", 0),
      categoryDoc(CATEGORY_ID, "B", "b", 0),
      categoryDoc(THIRD_ID, "C", "c", 1)
    ]);
    ctx.categoryRepo.findAllWithAppCount.mockResolvedValue([]);
    return { ...ctx, service: new CategoryService(ctx.deps) };
  };

  beforeEach(() => {
    endSession.mockResolvedValue(undefined);
    withTransaction.mockImplementation((fn: () => unknown) => fn());
    startSession.mockResolvedValue(session);
  });

  it("swaps with the previous row and renumbers every row", async () => {
    const { service, categoryRepo } = setup();

    await service.move(CATEGORY_ID, "up");

    expect(categoryRepo.setSortOrders).toHaveBeenCalledWith(
      [CATEGORY_ID, OTHER_ID, THIRD_ID],
      session
    );
  });

  it("swaps with the next row", async () => {
    const { service, categoryRepo } = setup();

    await service.move(CATEGORY_ID, "down");

    expect(categoryRepo.setSortOrders.mock.calls[0][0]).toEqual([
      OTHER_ID,
      THIRD_ID,
      CATEGORY_ID
    ]);
  });

  it("is a no-op (but still normalises) at either end", async () => {
    const { service, categoryRepo } = setup();

    await service.move(OTHER_ID, "up");
    await service.move(THIRD_ID, "down");

    for (const call of categoryRepo.setSortOrders.mock.calls) {
      expect(call[0]).toEqual([OTHER_ID, CATEGORY_ID, THIRD_ID]);
    }
  });

  it("reads the order inside the transaction and returns the fresh list", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.findAllWithAppCount.mockResolvedValue([
      { ...categoryDoc(CATEGORY_ID, "B", "b", 0), appCount: 1 }
    ]);

    const result = await service.move(CATEGORY_ID, "up");

    expect(categoryRepo.findAll).toHaveBeenCalledWith(session);
    expect(result.map((c) => c._id)).toEqual([CATEGORY_ID]);
    expect(endSession).toHaveBeenCalled();
  });

  it("404s for an id that is not in the list and ends the session", async () => {
    const { service, categoryRepo } = setup();

    await expect(
      service.move("64b2f0c2f1a2b3c4d5e6f7ff", "up")
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(categoryRepo.setSortOrders).not.toHaveBeenCalled();
    expect(endSession).toHaveBeenCalled();
  });
});
