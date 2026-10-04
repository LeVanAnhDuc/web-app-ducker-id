// service
import { CategoryService } from "../";
// common
import { ConflictRequestError, NotFoundError } from "@/common/exceptions";
// others
import { CATEGORY_ID, categoryDoc, makeDeps } from "./make-deps";

describe("CategoryService.update", () => {
  const existing = categoryDoc(CATEGORY_ID, "Internal Tools", "internal-tools");

  const setup = () => {
    const ctx = makeDeps();
    ctx.categoryRepo.findById.mockResolvedValue(existing);
    ctx.categoryRepo.existsByNameEn.mockResolvedValue(false);
    ctx.categoryRepo.findSlugFamily.mockResolvedValue([]);
    ctx.categoryRepo.updateById.mockImplementation(async (_id, input) => ({
      ...existing,
      ...input
    }));
    ctx.webAppRepo.countByCategory.mockResolvedValue(2);
    return { ...ctx, service: new CategoryService(ctx.deps) };
  };

  it("regenerates the slug when name.en changes", async () => {
    const { service, categoryRepo } = setup();

    const dto = await service.update(CATEGORY_ID, {
      name: { en: "Dev Tools" }
    });

    expect(categoryRepo.updateById).toHaveBeenCalledWith(CATEGORY_ID, {
      slug: "dev-tools",
      name: { en: "Dev Tools", vi: existing.name.vi }
    });
    expect(dto.slug).toBe("dev-tools");
    expect(dto.appCount).toBe(2);
  });

  it("keeps the slug and skips the name check when only name.vi changes", async () => {
    const { service, categoryRepo } = setup();

    await service.update(CATEGORY_ID, { name: { vi: "Công cụ" } });

    expect(categoryRepo.existsByNameEn).not.toHaveBeenCalled();
    expect(categoryRepo.findSlugFamily).not.toHaveBeenCalled();
    expect(categoryRepo.updateById.mock.calls[0][1]).toEqual({
      slug: "internal-tools",
      name: { en: "Internal Tools", vi: "Công cụ" }
    });
  });

  it("excludes itself when checking name and slug, so a case-only rename keeps its slug", async () => {
    const { service, categoryRepo } = setup();

    await service.update(CATEGORY_ID, { name: { en: "internal tools" } });

    expect(categoryRepo.existsByNameEn).toHaveBeenCalledWith(
      "internal tools",
      CATEGORY_ID
    );
    expect(categoryRepo.findSlugFamily).toHaveBeenCalledWith(
      "internal-tools",
      CATEGORY_ID
    );
    expect(categoryRepo.updateById.mock.calls[0][1].slug).toBe(
      "internal-tools"
    );
  });

  it("suffixes the new slug when another category owns it", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.findSlugFamily.mockResolvedValue(["content"]);

    await service.update(CATEGORY_ID, { name: { en: "Content!" } });

    expect(categoryRepo.updateById.mock.calls[0][1].slug).toBe("content-2");
  });

  it("rejects a name.en owned by another category", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.existsByNameEn.mockResolvedValue(true);

    await expect(
      service.update(CATEGORY_ID, { name: { en: "Content" } })
    ).rejects.toBeInstanceOf(ConflictRequestError);
    expect(categoryRepo.updateById).not.toHaveBeenCalled();
  });

  it("404s for an unknown category", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.findById.mockResolvedValue(null);

    await expect(
      service.update(CATEGORY_ID, { name: { vi: "x" } })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("404s when the category disappears between read and write", async () => {
    const { service, categoryRepo } = setup();
    categoryRepo.updateById.mockResolvedValue(null);

    await expect(
      service.update(CATEGORY_ID, { name: { vi: "x" } })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
