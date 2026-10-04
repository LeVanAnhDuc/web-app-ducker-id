// others
import {
  normalizeCategoryName,
  pickFreeSlug,
  slugifyCategoryName
} from "./category.helper";

describe("normalizeCategoryName", () => {
  it.each([
    ["  Content  ", "Content"],
    ["Content\u200B", "Content"],
    ["\uFEFFFin\u200Dance", "Finance"],
    ["Internal\u00A0\u00A0 Tools", "Internal Tools"],
    ["\u00A0\u200B ", ""]
  ])("%j → %j", (input, expected) => {
    expect(normalizeCategoryName(input)).toBe(expected);
  });
});

describe("slugifyCategoryName", () => {
  it.each([
    ["Internal Tools", "internal-tools"],
    ["Đa dạng", "da-dang"],
    ["Phân Tích", "phan-tich"],
    ["R&D / Ops", "r-d-ops"],
    ["Apps 🚀", "apps"],
    ["🚀", ""],
    ["!!!", ""],
    ["---", ""]
  ])("%j → %j", (input, expected) => {
    expect(slugifyCategoryName(input)).toBe(expected);
  });

  it("caps the base so a -n suffix still fits in 100 characters", () => {
    const slug = slugifyCategoryName("a".repeat(100));
    expect(slug).toHaveLength(90);
    expect(pickFreeSlug(slug, [slug]).length).toBeLessThanOrEqual(100);
  });

  it("never ends on a dash after truncation", () => {
    const slug = slugifyCategoryName(`${"a".repeat(89)} b`);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("pickFreeSlug", () => {
  it("uses the base when free", () => {
    expect(pickFreeSlug("tools", ["tools-2"])).toBe("tools");
  });

  it("takes the lowest free suffix", () => {
    expect(pickFreeSlug("tools", ["tools", "tools-3"])).toBe("tools-2");
  });
});
