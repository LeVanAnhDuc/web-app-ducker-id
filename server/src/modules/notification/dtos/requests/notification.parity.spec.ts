// common
import { PAGINATION } from "@/common/pagination";
// modules
import {
  NotificationIdParamsDto,
  NotificationListQueryDto
} from "@/modules/notification/dtos/requests";
// validators
import {
  notificationIdParamSchema,
  notificationListQuerySchema
} from "@/validators/schemas/notification";
// others
import { expectParity } from "@test/helpers/validation-parity";

const ID = "507f1f77bcf86cd799439011";

describe("notification request DTOs match the Joi schemas", () => {
  it("NotificationListQueryDto ≡ notificationListQuerySchema", async () => {
    await expectParity(notificationListQuerySchema, NotificationListQueryDto, {
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

  it("NotificationIdParamsDto ≡ notificationIdParamSchema", async () => {
    await expectParity(notificationIdParamSchema, NotificationIdParamsDto, {
      valid: { id: ID },
      unknownStripped: { id: ID, extra: "x" },
      missing: {},
      null: { id: null },
      empty: { id: "" },
      wrongType: { id: 123 },
      notHex: { id: "507f1f77bcf86cd79943901z" }
    });
  });
});
