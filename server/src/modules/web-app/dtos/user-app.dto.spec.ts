// dtos
import { toUserAppDto } from "./user-app.dto";
// modules
import { WEB_APP_STATUSES, TOKEN_ENDPOINT_AUTH_METHODS } from "../constants";

const baseDoc = {
  _id: { toString: () => "app1" },
  categoryId: { toString: () => "cat1" },
  name: "blog",
  displayName: "Blog",
  description: "A blog",
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
  category: { displayName: "Content" },
  createdAt: new Date("2026-03-12T09:24:00.000Z"),
  updatedAt: new Date("2026-05-18T14:02:00.000Z")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("toUserAppDto", () => {
  it("maps the user-facing fields", () => {
    const dto = toUserAppDto(baseDoc);
    expect(dto._id).toBe("app1");
    expect(dto.displayName).toBe("Blog");
    expect(dto.description).toBe("A blog");
    expect(dto.homeUrl).toBe("https://blog.example.com");
    expect(dto.category).toBe("Content");
  });

  it("falls back to null category when not populated", () => {
    const dto = toUserAppDto({ ...baseDoc, category: null });
    expect(dto.category).toBeNull();
  });

  it("excludes clientSecretHash, clientId and all OAuth internals", () => {
    const dto = toUserAppDto(baseDoc) as unknown as Record<string, unknown>;
    expect(dto.clientSecretHash).toBeUndefined();
    expect(dto.clientId).toBeUndefined();
    expect(dto.grantTypes).toBeUndefined();
    expect(dto.scopes).toBeUndefined();
    expect(dto.tokenEndpointAuthMethod).toBeUndefined();
    expect(dto.requiredRoles).toBeUndefined();
    expect(dto.status).toBeUndefined();
    expect(dto.redirectUris).toBeUndefined();
  });
});
