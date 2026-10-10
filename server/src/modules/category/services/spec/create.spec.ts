// service
import { CategoryService } from "../";
// common
import { BadRequestError, ConflictRequestError } from "@/common/exceptions";
// others
import {
  CATEGORY_ID,
  categoryDoc,
  duplicateKeyError,
  makeDeps
} from "./make-deps";

const name = { en: "Finance", vi: "Tài chính" };

describe("CategoryService.create", () => {
  const setup = () => {
    const ctx = makeDeps();
    ctx.categoryRepo.existsByNameEn.mockResolvedValue(false);
    ctx.categoryRepo.findSlugFamily.mockResolvedValue([]);
    ctx.categoryRepo.findMaxSortOrder.mockResolvedValue(3);
    ctx.categoryRepo.create.mockImplementation(async (input) => ({
      ...categoryDoc(CATEGORY_ID, input.name.en, input.slug, input.sortOrder),
      name: input.name
    }));
    return { ...ctx, service: new CategoryService(ctx.deps) };
  };

  it("derives the slug from name.en and appends after the last category", async () => {
    const { service, categoryRepo } = setup();

    const dto = await service.create({ name });

    expect(categoryRepo.create).toHaveBeenCalledWith({
      slug: "finance",
      name,
      sortOrder: 4
    });
    expect(dto).toEqual({
      _id: CATEGORY_ID,
      slug: "finance",
      name,
      sortOrder: 4,
      appCount: 0
    });
  });

  it("starts at sortOrder 0 when there is no category yet", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.findMaxSortOrder.mockResolvedValue(-1);

    await service.create({ name });

    expect(categoryRepo.create.mock.calls[0][0].sortOrder).toBe(0);
  });

  it("suffixes the slug when it is already taken", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.findSlugFamily.mockResolvedValue(["finance", "finance-2"]);

    await service.create({ name });

    expect(categoryRepo.create.mock.calls[0][0].slug).toBe("finance-3");
  });

  it("maps đ to d instead of dropping it", async () => {
    const { service, categoryRepo } = setup();

    await service.create({ name: { en: "Đa dạng", vi: "Đa dạng" } });

    expect(categoryRepo.create.mock.calls[0][0].slug).toBe("da-dang");
  });

  it("rejects a name.en already used (any case) before writing", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.existsByNameEn.mockResolvedValue(true);

    await expect(service.create({ name })).rejects.toBeInstanceOf(
      ConflictRequestError
    );
    expect(categoryRepo.create).not.toHaveBeenCalled();
  });

  it("rejects a name.en with no slug-able character", async () => {
    const { service, categoryRepo } = setup();

    await expect(
      service.create({ name: { en: "🚀", vi: "Tên" } })
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(categoryRepo.create).not.toHaveBeenCalled();
  });

  it("recomputes the slug when a concurrent write took it first", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.findSlugFamily
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["finance"]);
    categoryRepo.create.mockRejectedValueOnce(duplicateKeyError("slug"));

    const dto = await service.create({ name });

    expect(categoryRepo.create).toHaveBeenCalledTimes(2);
    expect(dto.slug).toBe("finance-2");
  });

  it("gives up after the configured number of slug races", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.create.mockRejectedValue(duplicateKeyError("slug"));

    await expect(service.create({ name })).rejects.toThrow("E11000");
    expect(categoryRepo.create).toHaveBeenCalledTimes(3);
  });

  it("does not retry other errors", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.create.mockRejectedValue(new Error("boom"));

    await expect(service.create({ name })).rejects.toThrow("boom");
    expect(categoryRepo.create).toHaveBeenCalledTimes(1);
  });
});
