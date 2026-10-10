// others
import {
  findCaseInsensitiveDuplicates,
  migrateCategories
} from "./category-management.transform";

const legacy = [
  { _id: "c3", name: "identity", displayName: "Identity", sortOrder: 3 },
  { _id: "c1", name: "content", displayName: "Content", sortOrder: 1 },
  { _id: "c2", name: "tools", displayName: "Internal Tools", sortOrder: 2 },
  { _id: "c4", name: "finance", displayName: "Finance", sortOrder: 2 }
];

describe("migrateCategories", () => {
  it("carries the client's Vietnamese labels for the four seeded slugs", () => {
    const byId = new Map(migrateCategories(legacy).map((c) => [c._id, c]));
    expect(byId.get("c1")?.name).toEqual({ en: "Content", vi: "Nội dung" });
    expect(byId.get("c2")?.name).toEqual({
      en: "Internal Tools",
      vi: "Công cụ nội bộ"
    });
  });

  it("falls back to the English name for any other slug", () => {
    const finance = migrateCategories(legacy).find((c) => c._id === "c4");
    expect(finance?.name).toEqual({ en: "Finance", vi: "Finance" });
  });

  it("derives slugs from name.en", () => {
    const tools = migrateCategories(legacy).find((c) => c._id === "c2");
    expect(tools?.slug).toBe("internal-tools");
  });

  it("renumbers sortOrder 0..n-1, ties broken by _id", () => {
    expect(migrateCategories(legacy).map((c) => [c._id, c.sortOrder])).toEqual([
      ["c1", 0],
      ["c2", 1],
      ["c4", 2],
      ["c3", 3]
    ]);
  });

  it("suffixes slugs that collide after derivation", () => {
    const slugs = migrateCategories([
      { _id: "a", name: "x", displayName: "Ops!", sortOrder: 0 },
      { _id: "b", name: "y", displayName: "Ops?", sortOrder: 1 }
    ]).map((c) => c.slug);
    expect(slugs).toEqual(["ops", "ops-2"]);
  });

  it("keeps the legacy slug as the base when the name has none", () => {
    const [only] = migrateCategories([
      { _id: "a", name: "rocket", displayName: "🚀", sortOrder: 0 }
    ]);
    expect(only.slug).toBe("rocket");
  });
});

describe("findCaseInsensitiveDuplicates", () => {
  it("reports every member of a case-only clash", () => {
    expect(
      findCaseInsensitiveDuplicates(["Content", "Tools", "content"]).sort()
    ).toEqual(["Content", "content"]);
  });

  it("is empty when names are distinct", () => {
    expect(findCaseInsensitiveDuplicates(["A", "B"])).toEqual([]);
  });
});
