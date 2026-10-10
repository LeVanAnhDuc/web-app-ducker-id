// validators
import {
  createCategoryBodySchema,
  deleteCategoryBodySchema,
  moveCategoryBodySchema,
  updateCategoryBodySchema
} from "./category";
import { adminCreateAppBodySchema } from "./web-app";

const OPTIONS = { abortEarly: false, stripUnknown: true };
const ID = "64b2f0c2f1a2b3c4d5e6f7a1";
const ID2 = "64b2f0c2f1a2b3c4d5e6f7a2";

const messagesOf = (result: { error?: { details: { message: string }[] } }) =>
  result.error?.details.map((d) => d.message) ?? [];

describe("createCategoryBodySchema", () => {
  it("normalises both names", () => {
    const { value, error } = createCategoryBodySchema.validate(
      { name: { en: "  Content\u200B ", vi: "Nội\u00A0 dung" } },
      OPTIONS
    );
    expect(error).toBeUndefined();
    expect(value.name).toEqual({ en: "Content", vi: "Nội dung" });
  });

  it("strips slug and sortOrder sent by the client", () => {
    const { value } = createCategoryBodySchema.validate(
      { name: { en: "A", vi: "B" }, slug: "x", sortOrder: -1 },
      OPTIONS
    );
    expect(value).toEqual({ name: { en: "A", vi: "B" } });
  });

  it.each([
    ["", "category:validation.nameEn.required"],
    ["   ", "category:validation.nameEn.required"],
    ["\u200B\u00A0", "category:validation.nameEn.required"],
    ["🚀", "category:validation.nameEn.noSlug"],
    ["!!!", "category:validation.nameEn.noSlug"],
    ["a".repeat(101), "category:validation.nameEn.maxLength"]
  ])("name.en %j → %s", (en, message) => {
    const result = createCategoryBodySchema.validate(
      { name: { en, vi: "x" } },
      OPTIONS
    );
    expect(messagesOf(result)).toContain(message);
  });

  it("accepts exactly 100 characters", () => {
    const { error } = createCategoryBodySchema.validate(
      { name: { en: "a".repeat(100), vi: "b".repeat(100) } },
      OPTIONS
    );
    expect(error).toBeUndefined();
  });

  it("reports both missing names at once", () => {
    const result = createCategoryBodySchema.validate(
      { name: { en: "", vi: "" } },
      OPTIONS
    );
    expect(messagesOf(result)).toEqual([
      "category:validation.nameEn.required",
      "category:validation.nameVi.required"
    ]);
  });

  it("allows a Vietnamese name with no Latin letter", () => {
    const { error } = createCategoryBodySchema.validate(
      { name: { en: "Tools", vi: "🚀" } },
      OPTIONS
    );
    expect(error).toBeUndefined();
  });
});

describe("updateCategoryBodySchema", () => {
  it.each([[{}], [{ name: {} }], [{ name: { vi: "   " } }]])(
    "rejects %j",
    (body) => {
      expect(
        updateCategoryBodySchema.validate(body, OPTIONS).error
      ).toBeDefined();
    }
  );

  it("accepts a single language", () => {
    const { value, error } = updateCategoryBodySchema.validate(
      { name: { vi: " Công cụ " } },
      OPTIONS
    );
    expect(error).toBeUndefined();
    expect(value).toEqual({ name: { vi: "Công cụ" } });
  });
});

describe("moveCategoryBodySchema", () => {
  it("accepts up/down only", () => {
    expect(
      moveCategoryBodySchema.validate({ direction: "up" }).error
    ).toBeUndefined();
    expect(
      moveCategoryBodySchema.validate({ direction: "sideways" }).error
    ).toBeDefined();
  });
});

describe("deleteCategoryBodySchema", () => {
  it("defaults to no reassignments when the body is empty", () => {
    expect(deleteCategoryBodySchema.validate(undefined, OPTIONS).value).toEqual(
      {
        reassignments: []
      }
    );
    expect(deleteCategoryBodySchema.validate({}, OPTIONS).value).toEqual({
      reassignments: []
    });
  });

  it("rejects the same app twice", () => {
    const result = deleteCategoryBodySchema.validate(
      {
        reassignments: [
          { appId: ID, categoryId: ID2 },
          { appId: ID, categoryId: ID2 }
        ]
      },
      OPTIONS
    );
    expect(messagesOf(result)).toContain(
      "category:validation.reassignments.duplicateApp"
    );
  });

  it("rejects a non-ObjectId target", () => {
    const result = deleteCategoryBodySchema.validate(
      { reassignments: [{ appId: ID, categoryId: "garbage" }] },
      OPTIONS
    );
    expect(messagesOf(result)).toContain(
      "category:validation.targetId.invalid"
    );
  });

  it("caps the list at 500 entries", () => {
    const reassignments = Array.from({ length: 501 }, (_, i) => ({
      appId: i.toString(16).padStart(24, "0"),
      categoryId: ID2
    }));
    const result = deleteCategoryBodySchema.validate(
      { reassignments },
      OPTIONS
    );
    expect(messagesOf(result)).toContain(
      "category:validation.reassignments.tooMany"
    );
  });
});

describe("adminCreateAppBodySchema categoryIds", () => {
  const base = {
    name: "blog",
    displayName: "Blog",
    homeUrl: "https://blog.example.com",
    status: "active",
    requiredRoles: ["user"],
    redirectUris: ["https://blog.example.com/cb"]
  };
  const ids = (n: number) =>
    Array.from({ length: n }, (_, i) => i.toString(16).padStart(24, "a"));

  it.each([
    [0, "webApp:validation.categoryIds.required"],
    [6, "webApp:validation.categoryIds.max"]
  ])("%i categories → %s", (count, message) => {
    const result = adminCreateAppBodySchema.validate(
      { ...base, categoryIds: ids(count) },
      OPTIONS
    );
    expect(messagesOf(result)).toContain(message);
  });

  it.each([1, 5])("%i categories is valid", (count) => {
    const { error } = adminCreateAppBodySchema.validate(
      { ...base, categoryIds: ids(count) },
      OPTIONS
    );
    expect(error).toBeUndefined();
  });

  it("rejects a duplicated id", () => {
    const result = adminCreateAppBodySchema.validate(
      { ...base, categoryIds: [ID, ID] },
      OPTIONS
    );
    expect(messagesOf(result)).toContain(
      "webApp:validation.categoryIds.duplicate"
    );
  });
});
