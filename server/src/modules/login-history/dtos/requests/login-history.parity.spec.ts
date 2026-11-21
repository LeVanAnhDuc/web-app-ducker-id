// common
import { PAGINATION } from "@/common/pagination";
// modules
import {
  LoginHistoryAdminQueryDto,
  LoginHistoryIdParamsDto,
  LoginHistoryQueryDto,
  LoginHistoryStatsQueryDto
} from "@/modules/login-history/dtos/requests";
// validators
import { SEARCH_MAX_LENGTH } from "@/validators/constants";
import {
  loginHistoryAdminQuerySchema,
  loginHistoryIdParamSchema,
  loginHistoryQuerySchema,
  loginHistoryStatsQuerySchema
} from "@/validators/schemas/login-history";
// others
import { expectParity } from "@test/helpers/validation-parity";

const ID = "507f1f77bcf86cd799439011";

// Every filter both lists declare identically, so both run the same rows.
const sharedQueryCases = {
  empty: {},
  unknownStripped: { foo: "x" },

  pageZero: { page: "0" },
  pageNotNumber: { page: "abc" },
  pageConverted: { page: "3", limit: "50" },
  limitTooLarge: { limit: String(PAGINATION.MAX_LIMIT + 1) },

  statusValid: { status: "failed" },
  statusEmpty: { status: "" },
  statusUnknown: { status: "pending" },
  statusWrongType: { status: ["failed"] },
  methodValid: { method: "magic-link" },
  methodUnknown: { method: "sms" },
  deviceTypeValid: { deviceType: "MOBILE" },
  deviceTypeLowerCase: { deviceType: "mobile" },
  clientTypeValid: { clientType: "WEB" },
  clientTypeUnknown: { clientType: "DESKTOP_APP" },
  sourceValid: { source: "oauth" },
  sourceUnknown: { source: "saml" },

  countryPadded: { country: "  Vietnam  " },
  countryEmpty: { country: "" },
  countryWhitespaceOnly: { country: "   " },
  countryAtMaxPadded: { country: ` ${"a".repeat(SEARCH_MAX_LENGTH)} ` },
  countryTooLong: { country: "a".repeat(SEARCH_MAX_LENGTH + 1) },
  cityTooLong: { city: "a".repeat(SEARCH_MAX_LENGTH + 1) },
  cityWrongType: { city: ["Hanoi"] },
  osPadded: { os: " macOS " },
  osEmpty: { os: "" },
  browserTooLong: { browser: "a".repeat(SEARCH_MAX_LENGTH + 1) },
  browserPadded: { browser: " Chrome " },

  webAppIdValid: { webAppId: ID },
  webAppIdEmpty: { webAppId: "" },
  webAppIdNotHex: { webAppId: "nope" },

  interactiveTrue: { interactive: "true" },
  interactiveFalse: { interactive: "false" },
  interactiveUpperCase: { interactive: "TRUE" },
  interactiveMixedCase: { interactive: "False" },
  interactiveNotBoolean: { interactive: "maybe" },
  interactiveEmpty: { interactive: "" },
  interactiveWrongType: { interactive: ["true"] },

  // Kept as sent: the filter reads a bare date as that whole day.
  fromDateDateOnly: { fromDate: "2026-10-04" },
  fromDateTimestamp: { fromDate: "2026-10-04T08:30:00+07:00" },
  fromDateEmpty: { fromDate: "" },
  fromDateNotIso: { fromDate: "yesterday" },
  fromDateWrongType: { fromDate: ["2026-10-04"] },
  toDateDateOnly: { toDate: "2026-10-04" },
  toDateNotIso: { toDate: "04/10/2026" },
  toDateEmpty: { toDate: "" },

  rangeSameDay: { fromDate: "2026-10-04", toDate: "2026-10-04" },
  rangeInverted: { fromDate: "2026-10-05", toDate: "2026-10-04" },
  rangeInvertedByOffset: {
    fromDate: "2026-10-04T00:00:00Z",
    toDate: "2026-10-04T05:00:00+07:00"
  },
  rangeFromInvalid: { fromDate: "bad", toDate: "2026-10-04" },
  rangeToInvalid: { fromDate: "2026-10-05", toDate: "bad" },

  sortByCreatedAt: { sortBy: "createdAt", sortOrder: "asc" },
  sortByEmpty: { sortBy: "" },
  sortByUnknown: { sortBy: "browser" },
  sortOrderUnknown: { sortOrder: "up" }
};

describe("login-history request DTOs match the Joi schemas", () => {
  it("LoginHistoryQueryDto ≡ loginHistoryQuerySchema", async () => {
    await expectParity(loginHistoryQuerySchema, LoginHistoryQueryDto, {
      ...sharedQueryCases,
      allFields: {
        page: "1",
        limit: "20",
        status: "success",
        method: "password",
        deviceType: "DESKTOP",
        clientType: "WEB",
        country: "VN",
        city: "Hanoi",
        os: "Windows",
        browser: "Chrome",
        source: "idp",
        webAppId: ID,
        interactive: "false",
        fromDate: "2026-10-01",
        toDate: "2026-10-04",
        sortBy: "country",
        sortOrder: "desc"
      },
      // The admin-only filter and sort keys are stripped or refused here.
      userIdStripped: { userId: ID },
      ipStripped: { ip: "10.0.0.1" },
      sortByAdminOnly: { sortBy: "ip" }
    });
  });

  it("LoginHistoryAdminQueryDto ≡ loginHistoryAdminQuerySchema", async () => {
    await expectParity(
      loginHistoryAdminQuerySchema,
      LoginHistoryAdminQueryDto,
      {
        ...sharedQueryCases,
        allFields: {
          page: "1",
          limit: "20",
          userId: ID,
          ip: " 10.0.0.1 ",
          status: "failed",
          interactive: "true",
          fromDate: "2026-10-01T00:00:00Z",
          toDate: "2026-10-04",
          sortBy: "usernameAttempted",
          sortOrder: "asc"
        },
        userIdValid: { userId: ID },
        userIdEmpty: { userId: "" },
        userIdNotHex: { userId: "nope" },
        ipPadded: { ip: "  10.0.0.1  " },
        ipEmpty: { ip: "" },
        ipTooLong: { ip: "1".repeat(SEARCH_MAX_LENGTH + 1) },
        sortByIp: { sortBy: "ip" },
        sortByUsernameAttempted: { sortBy: "usernameAttempted" }
      }
    );
  });

  it("LoginHistoryStatsQueryDto ≡ loginHistoryStatsQuerySchema", async () => {
    await expectParity(
      loginHistoryStatsQuerySchema,
      LoginHistoryStatsQueryDto,
      {
        empty: {},
        unknownStripped: { foo: "x" },
        allFields: { range: "30d", tz: "Asia/Saigon" },

        rangeValid: { range: "90d" },
        rangeEmpty: { range: "" },
        rangeUnknown: { range: "365d" },
        rangeWrongType: { range: ["7d"] },

        tzCanonical: { tz: "Asia/Ho_Chi_Minh" },
        tzLink: { tz: "Asia/Saigon" },
        tzUtc: { tz: "UTC" },
        tzUnknown: { tz: "Mars/Base" },
        tzEmpty: { tz: "" },
        tzTooLong: { tz: `Asia/${"a".repeat(64)}` },
        tzWrongType: { tz: ["UTC"] },
        tzPathLike: { tz: "../../etc" }
      }
    );
  });

  it("LoginHistoryIdParamsDto ≡ loginHistoryIdParamSchema", async () => {
    await expectParity(loginHistoryIdParamSchema, LoginHistoryIdParamsDto, {
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
