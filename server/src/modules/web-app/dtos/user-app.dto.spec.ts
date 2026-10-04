// dtos
import { toUserAppDto } from "./user-app.dto";
// modules
import { WEB_APP_STATUSES, TOKEN_ENDPOINT_AUTH_METHODS } from "../constants";

const baseDoc = {
  _id: { toString: () => "app1" },
  categoryIds: [{ toString: () => "cat2" }, { toString: () => "cat1" }],
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
  categories: [
    {
      _id: { toString: () => "cat1" },
      slug: "content",
      name: { en: "Content", vi: "Nội dung" }
    },
    {
      _id: { toString: () => "cat2" },
      slug: "tools",
      name: { en: "Tools", vi: "Công cụ" }
    }
  ],
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
    expect(dto.categories.map((c) => c.slug)).toEqual(["tools", "content"]);
  });

  it("orders categories by categoryIds, not by populate order", () => {
    const dto = toUserAppDto(baseDoc);
    expect(dto.categories[0]).toEqual({
      _id: "cat2",
      slug: "tools",
      name: { en: "Tools", vi: "Công cụ" }
    });
  });

  it("drops an id whose category is gone instead of emitting a hole", () => {
    const dto = toUserAppDto({
      ...baseDoc,
      categories: [baseDoc.categories[0]]
    });
    expect(dto.categories.map((c) => c._id)).toEqual(["cat1"]);
  });

  it("exposes only _id, slug and name for each category", () => {
    const withExtras = {
      ...baseDoc,
      categories: baseDoc.categories.map((c: object) => ({
        ...c,
        sortOrder: 3,
        createdAt: new Date()
      }))
    };
    const [first] = toUserAppDto(withExtras).categories;
    expect(Object.keys(first).sort()).toEqual(["_id", "name", "slug"]);
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
