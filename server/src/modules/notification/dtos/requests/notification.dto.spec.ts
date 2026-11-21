// common
import { PAGINATION } from "@/common/pagination";
// modules
import { NotificationListQueryDto } from "@/modules/notification/dtos/requests";
// validators
// others
import { expectDto } from "@test/helpers/dto-cases";

describe("notification request DTOs match the Joi schemas", () => {
  it("NotificationListQueryDto ≡ notificationListQuerySchema", async () => {
    await expectDto(NotificationListQueryDto, {
      empty: {},
      unknownStripped: { foo: "x", sortBy: "createdAt" },
      allFields: {
        page: "2",
        limit: "10",
        isRead: "false",
        category: "security",
        sortOrder: "asc"
      },

      pageZero: { page: "0" },
      pageNotNumber: { page: "abc" },
      limitTooLarge: { limit: String(PAGINATION.MAX_LIMIT + 1) },

      isReadTrue: { isRead: "true" },
      isReadFalse: { isRead: "false" },
      isReadUpperCase: { isRead: "TRUE" },
      isReadMixedCase: { isRead: "False" },
      isReadBoolean: { isRead: false },
      isReadNotBoolean: { isRead: "maybe" },
      isReadEmpty: { isRead: "" },
      isReadNumeric: { isRead: "1" },
      isReadPadded: { isRead: " true" },
      isReadWrongType: { isRead: ["true"] },

      categoryValid: { category: "app" },
      categoryEmpty: { category: "" },
      categoryUnknown: { category: "marketing" },
      categoryWrongType: { category: ["app"] },

      sortOrderUnknown: { sortOrder: "up" },
      sortOrderEmpty: { sortOrder: "" }
    });
  });
});
