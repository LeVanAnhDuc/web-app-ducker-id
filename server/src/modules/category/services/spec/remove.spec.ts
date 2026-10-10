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
import {
  BadRequestError,
  ConflictRequestError,
  NotFoundError
} from "@/common/exceptions";
// others
import {
  CATEGORY_ID,
  OTHER_ID,
  THIRD_ID,
  categoryDoc,
  makeDeps
} from "./make-deps";

const session = { withTransaction, endSession };
const APP_A = "64b2f0c2f1a2b3c4d5e6f701";
const APP_B = "64b2f0c2f1a2b3c4d5e6f702";

describe("CategoryService.remove", () => {
  const setup = (orphans: string[] = []) => {
    const ctx = makeDeps();
    ctx.categoryRepo.findById.mockResolvedValue(
      categoryDoc(CATEGORY_ID, "Tools", "tools")
    );
    ctx.categoryRepo.countByIds.mockImplementation(
      async (ids: string[]) =>
        ids.filter((id) => id === OTHER_ID || id === THIRD_ID).length
    );
    ctx.webAppRepo.findOrphansOf.mockResolvedValue(
      orphans.map((id) => ({ _id: id, displayName: id }))
    );
    return { ...ctx, service: new CategoryService(ctx.deps) };
  };

  const expectNothingWritten = (ctx: ReturnType<typeof setup>) => {
    expect(ctx.webAppRepo.reassignOrphans).not.toHaveBeenCalled();
    expect(ctx.webAppRepo.pullCategory).not.toHaveBeenCalled();
    expect(ctx.categoryRepo.deleteById).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    endSession.mockResolvedValue(undefined);
    withTransaction.mockImplementation((fn: () => unknown) => fn());
    startSession.mockResolvedValue(session);
  });

  it("deletes straight away when no app is orphaned", async () => {
    const ctx = setup();

    await ctx.service.remove(CATEGORY_ID, []);

    expect(ctx.webAppRepo.reassignOrphans).toHaveBeenCalledWith(
      CATEGORY_ID,
      [],
      session
    );
    expect(ctx.webAppRepo.pullCategory).toHaveBeenCalledWith(
      CATEGORY_ID,
      session
    );
    expect(ctx.categoryRepo.deleteById).toHaveBeenCalledWith(
      CATEGORY_ID,
      session
    );
  });

  it("reassigns orphans to different targets, then pulls and deletes", async () => {
    const ctx = setup([APP_A, APP_B]);
    const reassignments = [
      { appId: APP_A, categoryId: OTHER_ID },
      { appId: APP_B, categoryId: THIRD_ID }
    ];

    await ctx.service.remove(CATEGORY_ID, reassignments);

    expect(ctx.webAppRepo.reassignOrphans).toHaveBeenCalledWith(
      CATEGORY_ID,
      reassignments,
      session
    );
    const order = [
      ctx.webAppRepo.reassignOrphans.mock.invocationCallOrder[0],
      ctx.webAppRepo.pullCategory.mock.invocationCallOrder[0],
      ctx.categoryRepo.deleteById.mock.invocationCallOrder[0]
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("requires reassignments when orphans exist", async () => {
    const ctx = setup([APP_A]);

    await expect(ctx.service.remove(CATEGORY_ID, [])).rejects.toMatchObject({
      code: "CATEGORY_REASSIGN_REQUIRED"
    });
    expectNothingWritten(ctx);
  });

  it("rejects the category itself as a target", async () => {
    const ctx = setup([APP_A]);

    await expect(
      ctx.service.remove(CATEGORY_ID, [
        { appId: APP_A, categoryId: CATEGORY_ID }
      ])
    ).rejects.toBeInstanceOf(BadRequestError);
    expectNothingWritten(ctx);
  });

  it("rejects a target that no longer exists", async () => {
    const ctx = setup([APP_A]);

    await expect(
      ctx.service.remove(CATEGORY_ID, [
        { appId: APP_A, categoryId: "64b2f0c2f1a2b3c4d5e6f7ff" }
      ])
    ).rejects.toMatchObject({ code: "CATEGORY_REASSIGN_INVALID" });
    expectNothingWritten(ctx);
  });

  it("409s when an orphan is missing from the reassignments", async () => {
    const ctx = setup([APP_A, APP_B]);

    await expect(
      ctx.service.remove(CATEGORY_ID, [{ appId: APP_A, categoryId: OTHER_ID }])
    ).rejects.toBeInstanceOf(ConflictRequestError);
    expectNothingWritten(ctx);
  });

  it("409s when a reassigned app is not an orphan of this category", async () => {
    const ctx = setup([APP_A]);

    await expect(
      ctx.service.remove(CATEGORY_ID, [
        { appId: APP_A, categoryId: OTHER_ID },
        { appId: APP_B, categoryId: OTHER_ID }
      ])
    ).rejects.toMatchObject({ code: "CATEGORY_IMPACT_CHANGED" });
    expectNothingWritten(ctx);
  });

  it("409s when reassignments are sent but nothing is orphaned anymore", async () => {
    const ctx = setup([]);

    await expect(
      ctx.service.remove(CATEGORY_ID, [{ appId: APP_A, categoryId: OTHER_ID }])
    ).rejects.toBeInstanceOf(ConflictRequestError);
    expectNothingWritten(ctx);
  });

  it("404s for an unknown category and still ends the session", async () => {
    const ctx = setup();
    ctx.categoryRepo.findById.mockResolvedValue(null);

    await expect(ctx.service.remove(CATEGORY_ID, [])).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(endSession).toHaveBeenCalled();
  });
});
