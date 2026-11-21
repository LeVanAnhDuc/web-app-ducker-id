// modules
import {
  FavoriteAppIdParamsDto,
  ListFavoritesQueryDto
} from "@/modules/favorite/dtos/requests";
// validators
import { SEARCH_MAX_LENGTH } from "@/validators/constants";
import {
  favoriteAppIdParamSchema,
  listFavoritesQuerySchema
} from "@/validators/schemas/favorite";
// others
import { expectParity } from "@test/helpers/validation-parity";

const APP_ID = "507f1f77bcf86cd799439011";

describe("favorite request DTOs match the Joi schemas", () => {
  it("FavoriteAppIdParamsDto ≡ favoriteAppIdParamSchema", async () => {
    await expectParity(favoriteAppIdParamSchema, FavoriteAppIdParamsDto, {
      valid: { appId: APP_ID },
      unknownStripped: { appId: APP_ID, extra: "x" },
      missing: {},
      null: { appId: null },
      empty: { appId: "" },
      wrongType: { appId: 123 },
      notHex: { appId: "507f1f77bcf86cd79943901z" },
      tooShort: { appId: "507f1f77bcf86cd79943901" }
    });
  });

  it("ListFavoritesQueryDto ≡ listFavoritesQuerySchema", async () => {
    await expectParity(listFavoritesQuerySchema, ListFavoritesQueryDto, {
      empty: {},
      // The list is not paged: Joi stripped page/limit/sortOrder, as must the DTO.
      unknownStripped: { page: "2", limit: "5", sortOrder: "asc", foo: "x" },
      allFields: { search: "mail", categoryId: APP_ID, sort: "name" },

      searchPadded: { search: "  mail  " },
      searchEmpty: { search: "" },
      searchWhitespaceOnly: { search: "   " },
      searchWrongType: { search: ["a", "b"] },
      searchAtMaxPadded: { search: ` ${"a".repeat(SEARCH_MAX_LENGTH)} ` },
      searchTooLong: { search: "a".repeat(SEARCH_MAX_LENGTH + 1) },

      categoryIdValid: { categoryId: APP_ID },
      categoryIdEmpty: { categoryId: "" },
      categoryIdNotHex: { categoryId: "nope" },
      categoryIdWrongType: { categoryId: [APP_ID] },

      sortRecent: { sort: "recent" },
      sortName: { sort: "name" },
      sortEmpty: { sort: "" },
      sortUnknown: { sort: "popular" },
      sortWrongType: { sort: ["name"] }
    });
  });
});
