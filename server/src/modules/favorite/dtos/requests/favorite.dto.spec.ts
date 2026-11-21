// modules
import { ListFavoritesQueryDto } from "@/modules/favorite/dtos/requests";
// validators
import { SEARCH_MAX_LENGTH } from "@/validators/constants";
// others
import { expectDto } from "@test/helpers/dto-cases";

const APP_ID = "507f1f77bcf86cd799439011";

describe("favorite request DTOs match the Joi schemas", () => {
  it("ListFavoritesQueryDto ≡ listFavoritesQuerySchema", async () => {
    await expectDto(ListFavoritesQueryDto, {
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
