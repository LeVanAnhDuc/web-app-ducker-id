// service
import { CategoryService } from "../";
// common
import { NotFoundError } from "@/common/exceptions";
// others
import { CATEGORY_ID, categoryDoc, makeDeps } from "./make-deps";

describe("CategoryService.deleteImpact", () => {
  it("returns the total and the orphaned apps", async () => {
    const { deps, categoryRepo, webAppRepo } = makeDeps();
    categoryRepo.findById.mockResolvedValue(
      categoryDoc(CATEGORY_ID, "Tools", "tools")
    );
    webAppRepo.countByCategory.mockResolvedValue(4);
    webAppRepo.findOrphansOf.mockResolvedValue([
      { _id: "a1", displayName: "Shorten Link" }
    ]);

    const result = await new CategoryService(deps).deleteImpact(CATEGORY_ID);

    expect(result).toEqual({
      total: 4,
      orphaned: [{ _id: "a1", displayName: "Shorten Link" }]
    });
  });

  it("404s for an unknown category", async () => {
    const { deps, categoryRepo } = makeDeps();
    categoryRepo.findById.mockResolvedValue(null);

    await expect(
      new CategoryService(deps).deleteImpact(CATEGORY_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
