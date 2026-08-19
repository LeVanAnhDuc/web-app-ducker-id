// dtos
import { toAdminAppDto, toAdminAppCreatedDto } from "./admin-app.dto";
// modules
import { WEB_APP_STATUSES, TOKEN_ENDPOINT_AUTH_METHODS } from "../constants";

const baseDoc = {
  _id: { toString: () => "app1" },
  categoryId: { toString: () => "cat1" },
  name: "blog",
  displayName: "Blog",
  description: "desc",
  iconUrl: null,
  homeUrl: "https://blog.example.com",
  clientId: "client_blog",
  clientSecretHash: "secret-hash",
  redirectUris: ["https://blog.example.com/cb"],
  postLogoutRedirectUris: [],
  backchannelLogoutUri: null,
  grantTypes: ["authorization_code"],
  responseTypes: ["code"],
  scopes: ["openid"],
  tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
  requiredRoles: ["user"],
  status: WEB_APP_STATUSES.ACTIVE,
  sortOrder: 1,
  createdAt: new Date("2026-03-12T09:24:00.000Z"),
  updatedAt: new Date("2026-05-18T14:02:00.000Z")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("toAdminAppDto", () => {
  it("maps BE status ACTIVE to public 'active'", () => {
    expect(toAdminAppDto(baseDoc).status).toBe("active");
  });

  it("excludes clientSecretHash and OAuth internals", () => {
    const dto = toAdminAppDto(baseDoc) as unknown as Record<string, unknown>;
    expect(dto.clientSecretHash).toBeUndefined();
    expect(dto.grantTypes).toBeUndefined();
    expect(dto.scopes).toBeUndefined();
    expect(dto.tokenEndpointAuthMethod).toBeUndefined();
  });

  it("converts ObjectIds and dates to strings", () => {
    const dto = toAdminAppDto(baseDoc);
    expect(dto._id).toBe("app1");
    expect(dto.categoryId).toBe("cat1");
    expect(dto.createdAt).toBe("2026-03-12T09:24:00.000Z");
  });
});

describe("toAdminAppCreatedDto", () => {
  it("includes the plaintext clientSecret", () => {
    const dto = toAdminAppCreatedDto(baseDoc, "plaintext-secret");
    expect(dto.clientSecret).toBe("plaintext-secret");
  });

  it("carries all AdminAppDto fields and still excludes the hash", () => {
    const dto = toAdminAppCreatedDto(baseDoc, "x") as unknown as Record<
      string,
      unknown
    >;
    expect(dto.clientId).toBe("client_blog");
    expect(dto.clientSecretHash).toBeUndefined();
  });
});
