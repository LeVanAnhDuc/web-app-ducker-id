// modules
import {
  CategoryIdParamsDto,
  CreateCategoryBodyDto,
  DeleteCategoryBodyDto,
  MoveCategoryBodyDto,
  UpdateCategoryBodyDto
} from "@/modules/category/dtos/requests";
// validators
import {
  categoryIdParamSchema,
  createCategoryBodySchema,
  deleteCategoryBodySchema,
  moveCategoryBodySchema,
  updateCategoryBodySchema
} from "@/validators/schemas/category";
// others
import { expectParity } from "@test/helpers/validation-parity";

const ID = "64b2f0c2f1a2b3c4d5e6f7a1";
const ID2 = "64b2f0c2f1a2b3c4d5e6f7a2";

const named = (en: unknown, vi: unknown = "Nội dung") => ({ name: { en, vi } });

describe("category request DTOs match the Joi schemas", () => {
  it("CreateCategoryBodyDto ≡ createCategoryBodySchema", async () => {
    await expectParity(createCategoryBodySchema, CreateCategoryBodyDto, {
      valid: named("Content"),
      // Zero-width characters dropped, NBSP and runs folded, then trimmed.
      normalised: named("  Content\u200B ", "Nội\u00A0 dung"),
      unknownStripped: {
        name: { en: "A", vi: "B", fr: "C" },
        slug: "x",
        sortOrder: -1
      },
      emptyBody: {},

      nameNull: { name: null },
      nameString: { name: "Content" },
      nameArray: { name: [] },
      nameEmptyObject: { name: {} },

      enMissing: { name: { vi: "x" } },
      enNull: named(null),
      enWrongType: named(123),
      enEmpty: named(""),
      enWhitespaceOnly: named("   "),
      enInvisibleOnly: named("\u200B\u00A0"),
      // DR-12: no letter or digit left, so no slug.
      enOnlyPunctuation: named("!!!"),
      enOnlyEmoji: named("🚀"),
      enAtMax: named("a".repeat(100)),
      enTooLong: named("a".repeat(101)),
      // Normalised before the length check: padding does not count.
      enPaddedAtMax: named(`  ${"a".repeat(100)} \u200B`),
      enFoldedToMax: named(`${"a".repeat(50)}   ${"b".repeat(49)}`),

      viMissing: { name: { en: "Tools" } },
      viNull: named("Tools", null),
      viWrongType: named("Tools", 5),
      viEmpty: named("Tools", ""),
      // Only the English name needs a slug.
      viOnlyEmoji: named("Tools", "🚀"),
      viTooLong: named("Tools", "a".repeat(101)),
      bothEmpty: named("", "")
    });
  });

  it("UpdateCategoryBodyDto ≡ updateCategoryBodySchema", async () => {
    await expectParity(updateCategoryBodySchema, UpdateCategoryBodyDto, {
      both: named(" Tools ", " Công cụ "),
      viOnly: { name: { vi: " Công cụ " } },
      enOnly: { name: { en: "Tools" } },
      unknownStripped: { name: { en: "Tools", fr: "Outils" }, slug: "x" },

      // `name` with nothing in it is reported on `name`, not the root.
      emptyBody: {},
      nameNull: { name: null },
      nameString: { name: "Tools" },
      nameArray: { name: ["Tools"] },
      nameEmptyObject: { name: {} },
      nameOnlyUnknown: { name: { fr: "Outils" } },

      enNull: { name: { en: null } },
      enEmpty: { name: { en: "" } },
      enOnlyPunctuation: { name: { en: "!!!" } },
      enTooLong: { name: { en: "a".repeat(101) } },
      enPaddedAtMax: { name: { en: ` ${"a".repeat(100)} ` } },
      viWhitespaceOnly: { name: { vi: "   " } },
      viWrongType: { name: { vi: 5 } },
      viTooLong: { name: { vi: "a".repeat(101) } }
    });
  });

  it("MoveCategoryBodyDto ≡ moveCategoryBodySchema", async () => {
    await expectParity(moveCategoryBodySchema, MoveCategoryBodyDto, {
      up: { direction: "up" },
      down: { direction: "down" },
      unknownStripped: { direction: "up", steps: 2 },
      missing: {},
      null: { direction: null },
      empty: { direction: "" },
      wrongType: { direction: 1 },
      wrongCase: { direction: "UP" },
      unknown: { direction: "sideways" },
      array: { direction: ["up"] }
    });
  });

  it("DeleteCategoryBodyDto ≡ deleteCategoryBodySchema", async () => {
    await expectParity(deleteCategoryBodySchema, DeleteCategoryBodyDto, {
      // A DELETE usually has no body: the list defaults to empty.
      undefinedBody: undefined,
      emptyBody: {},
      emptyList: { reassignments: [] },
      valid: { reassignments: [{ appId: ID, categoryId: ID2 }] },
      // The service answers a repeated appId with CATEGORY_REASSIGN_INVALID.
      sameAppTwice: {
        reassignments: [
          { appId: ID, categoryId: ID2 },
          { appId: ID, categoryId: ID2 }
        ]
      },
      unknownStripped: {
        reassignments: [{ appId: ID, categoryId: ID2, note: "x" }],
        force: true
      },

      listNull: { reassignments: null },
      listObject: { reassignments: { appId: ID, categoryId: ID2 } },
      listString: { reassignments: "x" },
      tooMany: {
        reassignments: Array.from({ length: 501 }, (_, i) => ({
          appId: i.toString(16).padStart(24, "0"),
          categoryId: ID2
        }))
      },
      atMax: {
        reassignments: Array.from({ length: 500 }, (_, i) => ({
          appId: i.toString(16).padStart(24, "0"),
          categoryId: ID2
        }))
      },

      badTarget: { reassignments: [{ appId: ID, categoryId: "garbage" }] },
      badApp: { reassignments: [{ appId: 5, categoryId: ID2 }] },
      emptyIds: { reassignments: [{ appId: "", categoryId: "" }] },
      missingIds: { reassignments: [{}] },
      nullIds: { reassignments: [{ appId: null, categoryId: null }] },
      secondItemBad: {
        reassignments: [
          { appId: ID, categoryId: ID2 },
          { appId: ID2, categoryId: "garbage" }
        ]
      },
      nonObjectItems: { reassignments: [5, null, "x"] }
    });
  });

  it("CategoryIdParamsDto ≡ categoryIdParamSchema", async () => {
    await expectParity(categoryIdParamSchema, CategoryIdParamsDto, {
      valid: { id: ID },
      validUpperCase: { id: ID.toUpperCase() },
      missing: {},
      empty: { id: "" },
      wrongType: { id: 123 },
      notHex: { id: `${ID.slice(1)}z` },
      unknownStripped: { id: ID, extra: "x" }
    });
  });
});
