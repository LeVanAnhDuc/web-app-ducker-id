// common
import { PAGINATION } from "@/common/pagination";
// modules
import {
  ListRecentAppsQueryDto,
  RecentAppsStatsQueryDto
} from "@/modules/recent-app/dtos/requests";
import { RECENT_APP_STATS } from "@/modules/recent-app/constants";
// validators
import { SEARCH_MAX_LENGTH } from "@/validators/constants";
// others
import { expectDto } from "@test/helpers/dto-cases";

describe("recent-app request DTOs match the Joi schemas", () => {
  it("ListRecentAppsQueryDto ≡ listRecentAppsQuerySchema", async () => {
    await expectDto(ListRecentAppsQueryDto, {
      empty: {},
      // No sortOrder on this list: Joi stripped it, as must the DTO.
      unknownStripped: { sortOrder: "asc", foo: "x" },
      allFields: { search: "mail", page: "2", limit: "20" },

      pageZero: { page: "0" },
      pageNotNumber: { page: "abc" },
      pageFraction: { page: "1.5" },
      pageEmpty: { page: "" },
      limitMax: { limit: String(PAGINATION.MAX_LIMIT) },
      limitTooLarge: { limit: String(PAGINATION.MAX_LIMIT + 1) },
      limitZero: { limit: "0" },

      searchPadded: { search: "  mail  " },
      searchEmpty: { search: "" },
      searchWhitespaceOnly: { search: "   " },
      searchWrongType: { search: ["a", "b"] },
      searchAtMaxPadded: { search: ` ${"a".repeat(SEARCH_MAX_LENGTH)} ` },
      searchTooLong: { search: "a".repeat(SEARCH_MAX_LENGTH + 1) }
    });
  });

  it("RecentAppsStatsQueryDto ≡ recentAppsStatsQuerySchema", async () => {
    await expectDto(RecentAppsStatsQueryDto, {
      empty: {},
      unknownStripped: { page: "2", foo: "x" },
      limitConverted: { limit: "3" },
      limitMax: { limit: String(RECENT_APP_STATS.TOP_APPS_MAX_LIMIT) },
      limitTooLarge: {
        limit: String(RECENT_APP_STATS.TOP_APPS_MAX_LIMIT + 1)
      },
      limitZero: { limit: "0" },
      limitFraction: { limit: "2.5" },
      limitNotNumber: { limit: "many" },
      limitEmpty: { limit: "" }
    });
  });
});
