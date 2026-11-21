// modules
import {
  AdminAppsQueryDto,
  AppIdParamsDto,
  CreateAppBodyDto,
  UpdateAppBodyDto,
  UserAppsQueryDto
} from "@/modules/web-app/dtos/requests";
// validators
// others
import { expectDto } from "@test/helpers/dto-cases";

const ID = "64b2f0c2f1a2b3c4d5e6f7a1";
const ID2 = "64b2f0c2f1a2b3c4d5e6f7a2";

const ids = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => i.toString(16).padStart(24, "a"));

const uris = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `https://blog.example.com/cb${i}`);

const VALID_APP = {
  name: "blog",
  displayName: "Blog",
  homeUrl: "https://blog.example.com",
  categoryIds: [ID],
  status: "active",
  requiredRoles: ["user"],
  redirectUris: ["https://blog.example.com/cb"]
};

const app = (overrides: Record<string, unknown>) => ({
  ...VALID_APP,
  ...overrides
});

const appWithout = (field: keyof typeof VALID_APP) => {
  const body: Record<string, unknown> = { ...VALID_APP };
  delete body[field];
  return body;
};

// Every rule of a field, applied to a body that is otherwise valid. Shared by
// create (where the rest of the body is required) and update (where each row
// is the whole body).
const fieldCases = {
  nameNull: { name: null },
  nameWrongType: { name: 123 },
  nameEmpty: { name: "" },
  nameWhitespaceOnly: { name: "   " },
  namePaddedUpperCase: { name: "  My-App  " },
  nameTooShort: { name: "a" },
  nameTooLong: { name: "a".repeat(65) },
  namePatternBreak: { name: "my_app" },
  nameTooShortAndPatternBreak: { name: "-" },

  displayNameNull: { displayName: null },
  displayNameWrongType: { displayName: 123 },
  displayNameEmpty: { displayName: "" },
  displayNamePadded: { displayName: "  My Blog  " },
  displayNameTooShort: { displayName: "A" },
  displayNameTooLong: { displayName: "a".repeat(81) },

  descriptionEmpty: { description: "" },
  descriptionWhitespaceOnly: { description: "   " },
  descriptionNull: { description: null },
  descriptionWrongType: { description: 123 },
  descriptionPaddedAtMax: { description: ` ${"a".repeat(500)} ` },
  descriptionTooLong: { description: "a".repeat(501) },

  iconUrlEmpty: { iconUrl: "" },
  iconUrlWhitespaceOnly: { iconUrl: "   " },
  iconUrlPadded: { iconUrl: "  https://cdn.example.com/i.png  " },
  iconUrlNull: { iconUrl: null },
  iconUrlWrongType: { iconUrl: 123 },
  iconUrlNotHttp: { iconUrl: "ftp://cdn.example.com/i.png" },
  iconUrlTooLong: { iconUrl: `https://${"a".repeat(2000)}` },

  homeUrlNull: { homeUrl: null },
  homeUrlEmpty: { homeUrl: "" },
  homeUrlWrongType: { homeUrl: 123 },
  homeUrlNotHttp: { homeUrl: "blog.example.com" },
  homeUrlTooLong: { homeUrl: `https://${"a".repeat(2000)}` },

  categoryIdsNull: { categoryIds: null },
  categoryIdsString: { categoryIds: ID },
  categoryIdsEmptyList: { categoryIds: [] },
  categoryIdsFive: { categoryIds: ids(5) },
  categoryIdsSix: { categoryIds: ids(6) },
  categoryIdsBadItem: { categoryIds: ["garbage"] },
  categoryIdsBadItems: { categoryIds: [ID, "garbage", 5] },
  categoryIdsEmptyItem: { categoryIds: [""] },
  categoryIdsDuplicate: { categoryIds: [ID, ID2, ID] },

  statusInactive: { status: "inactive" },
  statusNull: { status: null },
  statusEmpty: { status: "" },
  statusWrongCase: { status: "ACTIVE" },
  statusWrongType: { status: 1 },
  statusArray: { status: ["active"] },

  requiredRolesNull: { requiredRoles: null },
  requiredRolesString: { requiredRoles: "user" },
  requiredRolesEmptyList: { requiredRoles: [] },
  requiredRolesBoth: { requiredRoles: ["user", "admin"] },
  requiredRolesUnknown: { requiredRoles: ["root"] },
  requiredRolesBadItems: { requiredRoles: ["user", 5, ""] },

  redirectUrisNull: { redirectUris: null },
  redirectUrisString: { redirectUris: "https://blog.example.com/cb" },
  redirectUrisEmptyList: { redirectUris: [] },
  redirectUrisPaddedItem: { redirectUris: ["  https://blog.example.com/cb  "] },
  redirectUrisLocalhostHttp: { redirectUris: ["http://localhost:3000/cb"] },
  redirectUrisHttp: { redirectUris: ["http://blog.example.com/cb"] },
  redirectUrisFragment: { redirectUris: ["https://blog.example.com/cb#x"] },
  redirectUrisWildcard: { redirectUris: ["https://*.example.com/cb"] },
  redirectUrisOneBadEntry: {
    redirectUris: ["https://blog.example.com/cb", "http://evil.com/cb"]
  },
  redirectUrisBadItems: {
    redirectUris: [5, "", `https://blog.example.com/${"a".repeat(2000)}`]
  },
  redirectUrisAtMax: { redirectUris: uris(20) },
  redirectUrisTooMany: { redirectUris: uris(21) },

  postLogoutRedirectUrisEmptyList: { postLogoutRedirectUris: [] },
  postLogoutRedirectUrisValid: {
    postLogoutRedirectUris: [" https://blog.example.com/bye "]
  },
  postLogoutRedirectUrisNull: { postLogoutRedirectUris: null },
  postLogoutRedirectUrisString: {
    postLogoutRedirectUris: "https://blog.example.com/bye"
  },
  postLogoutRedirectUrisBadItem: {
    postLogoutRedirectUris: ["https://blog.example.com/bye", "javascript:x"]
  },
  postLogoutRedirectUrisTooMany: { postLogoutRedirectUris: uris(21) },

  tokenEndpointAuthMethodNone: { tokenEndpointAuthMethod: "none" },
  tokenEndpointAuthMethodNull: { tokenEndpointAuthMethod: null },
  tokenEndpointAuthMethodEmpty: { tokenEndpointAuthMethod: "" },
  tokenEndpointAuthMethodUnknown: {
    tokenEndpointAuthMethod: "private_key_jwt"
  },
  tokenEndpointAuthMethodWrongType: { tokenEndpointAuthMethod: 1 }
};

const createFieldCases = Object.fromEntries(
  Object.entries(fieldCases).map(([name, overrides]) => [name, app(overrides)])
);

const idCases = {
  valid: { id: ID },
  validUpperCase: { id: ID.toUpperCase() },
  missing: {},
  empty: { id: "" },
  wrongType: { id: 123 },
  tooShort: { id: ID.slice(1) },
  notHex: { id: `${ID.slice(1)}z` },
  unknownStripped: { id: ID, extra: "x" }
};

// Search and category filter are declared the same on both list queries.
const sharedQueryCases = {
  empty: {},
  searchPadded: { search: "  blog  " },
  searchEmpty: { search: "" },
  searchWhitespaceOnly: { search: "   " },
  searchWrongType: { search: ["a"] },
  searchAtMaxPadded: { search: ` ${"a".repeat(200)} ` },
  searchTooLong: { search: "a".repeat(201) },

  categoryIdValid: { categoryId: ID },
  categoryIdEmpty: { categoryId: "" },
  categoryIdNotHex: { categoryId: "garbage" },
  categoryIdArray: { categoryId: [ID] }
};

describe("web-app request DTOs match the Joi schemas", () => {
  it("CreateAppBodyDto ≡ adminCreateAppBodySchema", async () => {
    await expectDto(CreateAppBodyDto, {
      valid: VALID_APP,
      allFields: app({
        description: "  A blog  ",
        iconUrl: "https://cdn.example.com/i.png",
        postLogoutRedirectUris: ["https://blog.example.com/bye"],
        tokenEndpointAuthMethod: "client_secret_basic"
      }),
      unknownStripped: app({ scopes: ["openid"], clientId: "client_x" }),
      emptyBody: {},

      nameMissing: appWithout("name"),
      displayNameMissing: appWithout("displayName"),
      homeUrlMissing: appWithout("homeUrl"),
      categoryIdsMissing: appWithout("categoryIds"),
      statusMissing: appWithout("status"),
      requiredRolesMissing: appWithout("requiredRoles"),
      redirectUrisMissing: appWithout("redirectUris"),

      ...createFieldCases
    });
  });

  it("UpdateAppBodyDto ≡ adminUpdateAppBodySchema", async () => {
    await expectDto(UpdateAppBodyDto, {
      // PATCH /admin/apps/:id with nothing to change is an object-level
      // failure, field "".
      emptyBody: {},
      undefinedBody: undefined,
      unknownOnly: { scopes: ["openid"], clientId: "client_x" },
      allFields: {
        ...VALID_APP,
        description: "",
        iconUrl: "",
        postLogoutRedirectUris: [],
        tokenEndpointAuthMethod: "none"
      },
      ...fieldCases
    });
  });

  it("AppIdParamsDto ≡ adminAppIdParamSchema", async () => {
    await expectDto(AppIdParamsDto, idCases);
  });

  it("AdminAppsQueryDto ≡ adminListAppsQuerySchema", async () => {
    await expectDto(AdminAppsQueryDto, {
      ...sharedQueryCases,
      allFields: { search: " blog ", status: "inactive", categoryId: ID },
      // The admin list has no paging: page and limit are stripped unchecked.
      pagingStripped: { page: "0", limit: "abc", sortOrder: "up" },

      statusEmpty: { status: "" },
      statusWrongCase: { status: "ACTIVE" },
      statusArray: { status: ["active"] }
    });
  });

  it("UserAppsQueryDto ≡ listAppsQuerySchema", async () => {
    await expectDto(UserAppsQueryDto, {
      ...sharedQueryCases,
      allFields: { page: "2", limit: "20", search: " blog ", categoryId: ID },
      // Neither sort order nor status is a launcher filter: both are stripped.
      unknownStripped: { sortOrder: "up", status: "inactive" },

      pageZero: { page: "0" },
      pageNotNumber: { page: "abc" },
      pageFraction: { page: "1.5" },
      pageEmpty: { page: "" },
      limitTooLarge: { limit: "101" },
      limitZero: { limit: "0" }
    });
  });
});
