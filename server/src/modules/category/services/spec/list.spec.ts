// service
import { CategoryService } from "../";
// others
import { CATEGORY_ID, categoryDoc, makeDeps } from "./make-deps";

describe("CategoryService.list / listPublic", () => {
  it("admin list carries sortOrder and appCount", async () => {
    const { deps, categoryRepo } = makeDeps();
    categoryRepo.findAllWithAppCount.mockResolvedValue([
      { ...categoryDoc(CATEGORY_ID, "Tools", "tools", 2), appCount: 3 }
    ]);

    const [dto] = await new CategoryService(deps).list();

    expect(dto).toEqual({
      _id: CATEGORY_ID,
      slug: "tools",
      name: { en: "Tools", vi: "Tools (vi)" },
      sortOrder: 2,
      appCount: 3
    });
  });

  it("public list exposes only _id, slug and name", async () => {
    const { deps, categoryRepo } = makeDeps();
    categoryRepo.findAll.mockResolvedValue([
      categoryDoc(CATEGORY_ID, "Tools", "tools", 2)
    ]);

    const [dto] = await new CategoryService(deps).listPublic();

    expect(dto).toEqual({
      _id: CATEGORY_ID,
      slug: "tools",
      name: { en: "Tools", vi: "Tools (vi)" }
    });
  });
});
