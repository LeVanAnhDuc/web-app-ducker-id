// service
import { WebAppService } from "../";
// modules
import { WEB_APP_STATUSES } from "../../constants";
import {
  BadRequestError,
  ConflictRequestError,
  NotFoundError
} from "@/common/exceptions";
// others
import { RequestContext } from "@/utils/request-context";
import { createNotificationDispatcherMock } from "@test/mocks/notification-dispatcher.mock";

const makeRepos = () => {
  const webAppRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findActivePaginated: jest.fn().mockResolvedValue([]),
    countActive: jest.fn().mockResolvedValue(0),
    existsByName: jest.fn().mockResolvedValue(false),
    existsByNameExcludingId: jest.fn().mockResolvedValue(false),
    create: jest.fn(),
    updateById: jest.fn(),
    markAnnounced: jest.fn().mockResolvedValue(true)
  };
  const categoryRepo = {
    // Echo the count back so every id exists unless a test says otherwise.
    countByIds: jest.fn((ids: string[]) => Promise.resolve(ids.length))
  };
  const favoriteRepo = {
    findFavoritedAppIds: jest.fn().mockResolvedValue(new Set<string>())
  };
  // No overrides unless a test says otherwise: the scope is the role default.
  const accessPolicy = {
    resolveScope: jest.fn((_userId?: string, role?: string) =>
      Promise.resolve({
        role,
        allowIds: [] as string[],
        denyIds: [] as string[]
      })
    )
  };
  return { webAppRepo, categoryRepo, favoriteRepo, accessPolicy };
};

const validBody = {
  name: "blog",
  displayName: "Blog",
  description: "",
  iconUrl: "",
  homeUrl: "https://blog.example.com",
  categoryIds: ["6a24f14e6d65650b697c34c5", "6a24f14e6d65650b697c34c6"],
  status: "active" as const,
  requiredRoles: ["user" as const],
  redirectUris: ["https://blog.example.com/cb"]
};

const createdDoc = {
  _id: { toString: () => "app1" },
  categoryIds: [{ toString: () => "6a24f14e6d65650b697c34c5" }],
  name: "blog",
  displayName: "Blog",
  description: null,
  iconUrl: null,
  homeUrl: "https://blog.example.com",
  clientId: "client_generated",
  clientSecretHash: "hashed",
  redirectUris: ["https://blog.example.com/cb"],
  requiredRoles: ["user"],
  status: WEB_APP_STATUSES.ACTIVE,
  createdAt: new Date("2026-06-07T00:00:00.000Z"),
  updatedAt: new Date("2026-06-07T00:00:00.000Z")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("WebAppService.createApp", () => {
  it("throws ConflictRequestError when the name already exists", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.existsByName.mockResolvedValue(true);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    await expect(service.createApp(validBody)).rejects.toBeInstanceOf(
      ConflictRequestError
    );
    expect(webAppRepo.create).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when one of the categories does not exist", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    categoryRepo.countByIds.mockResolvedValue(1);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    await expect(service.createApp(validBody)).rejects.toBeInstanceOf(
      BadRequestError
    );
    expect(categoryRepo.countByIds).toHaveBeenCalledWith(validBody.categoryIds);
    expect(webAppRepo.create).not.toHaveBeenCalled();
  });

  it("generates credentials, hashes the secret, persists, and returns it once", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.create.mockResolvedValue(createdDoc);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });

    const result = await service.createApp(validBody);

    const persisted = webAppRepo.create.mock.calls[0][0];
    expect(persisted.clientId).toMatch(/^client_/);
    expect(persisted.clientSecretHash).not.toBe("");
    expect(persisted.clientSecretHash).not.toMatch(/^[a-f0-9]{64}$/); // hashed, not raw secret
    expect(persisted.status).toBe(WEB_APP_STATUSES.ACTIVE);
    expect(persisted.scopes).toEqual(["openid", "profile", "email"]);
    expect(persisted.description).toBeNull(); // "" → null
    expect(persisted.name).toBe(validBody.name);
    expect(persisted.categoryIds).toEqual(validBody.categoryIds);
    expect(persisted.homeUrl).toBe(validBody.homeUrl);
    expect(persisted.redirectUris).toEqual(validBody.redirectUris);
    expect(result.clientSecret).toMatch(/^[a-f0-9]{64}$/);
    expect(result.clientId).toBe("client_generated");
  });
});

const existingDoc = {
  _id: { toString: () => "app1" },
  categoryIds: [{ toString: () => "6a24f14e6d65650b697c34c5" }],
  name: "blog",
  displayName: "Blog",
  description: null,
  iconUrl: null,
  homeUrl: "https://blog.example.com",
  clientId: "client_blog",
  clientSecretHash: "hashed",
  redirectUris: ["https://blog.example.com/cb"],
  requiredRoles: ["user"],
  status: WEB_APP_STATUSES.ACTIVE,
  createdAt: new Date("2026-06-07T00:00:00.000Z"),
  updatedAt: new Date("2026-06-07T00:00:00.000Z")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("WebAppService.updateApp", () => {
  it("throws NotFoundError when the app does not exist", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findById.mockResolvedValue(null);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    await expect(
      service.updateApp("app1", { displayName: "New" })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(webAppRepo.updateById).not.toHaveBeenCalled();
  });

  it("throws ConflictRequestError when renaming to a name owned by another app", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    webAppRepo.existsByNameExcludingId.mockResolvedValue(true);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    await expect(
      service.updateApp("app1", { name: "taken" })
    ).rejects.toBeInstanceOf(ConflictRequestError);
    expect(webAppRepo.updateById).not.toHaveBeenCalled();
  });

  it("skips the name check when the name is unchanged", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    webAppRepo.updateById.mockResolvedValue(existingDoc);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    await service.updateApp("app1", { name: "blog", displayName: "Blog 2" });
    expect(webAppRepo.existsByNameExcludingId).not.toHaveBeenCalled();
    expect(webAppRepo.updateById).toHaveBeenCalled();
  });

  it("throws BadRequestError when a new category does not exist", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    categoryRepo.countByIds.mockResolvedValue(0);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    await expect(
      service.updateApp("app1", { categoryIds: ["6a24f14e6d65650b697c34c6"] })
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(webAppRepo.updateById).not.toHaveBeenCalled();
  });

  it("maps public status to internal when hiding (inactive)", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    webAppRepo.updateById.mockResolvedValue({
      ...existingDoc,
      status: WEB_APP_STATUSES.INACTIVE
    });
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    const result = await service.updateApp("app1", { status: "inactive" });
    const persisted = webAppRepo.updateById.mock.calls[0][1];
    expect(persisted.status).toBe(WEB_APP_STATUSES.INACTIVE);
    expect(result.status).toBe("inactive");
  });

  it("maps public status to internal when unhiding (active)", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findById.mockResolvedValue({
      ...existingDoc,
      status: WEB_APP_STATUSES.INACTIVE
    });
    webAppRepo.updateById.mockResolvedValue({
      ...existingDoc,
      status: WEB_APP_STATUSES.ACTIVE
    });
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    const result = await service.updateApp("app1", { status: "active" });
    const persisted = webAppRepo.updateById.mock.calls[0][1];
    expect(persisted.status).toBe(WEB_APP_STATUSES.ACTIVE);
    expect(result.status).toBe("active");
  });

  it("only persists provided fields and returns the mapped DTO", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    webAppRepo.updateById.mockResolvedValue({
      ...existingDoc,
      displayName: "Renamed"
    });
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    const result = await service.updateApp("app1", { displayName: "Renamed" });
    const persisted = webAppRepo.updateById.mock.calls[0][1];
    expect(Object.keys(persisted)).toEqual(["displayName"]);
    expect(categoryRepo.countByIds).not.toHaveBeenCalled();
    expect(result.displayName).toBe("Renamed");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).clientSecret).toBeUndefined();
  });
});

describe("WebAppService.listUserApps", () => {
  const activeDoc = {
    _id: { toString: () => "app1" },
    displayName: "Blog",
    description: "A blog",
    iconUrl: null,
    homeUrl: "https://blog.example.com",
    categoryIds: [{ toString: () => "c2" }, { toString: () => "c1" }],
    // Populated in query order, not in the admin's order.
    categories: [
      {
        _id: { toString: () => "c1" },
        slug: "content",
        name: { en: "Content", vi: "Nội dung" }
      },
      {
        _id: { toString: () => "c2" },
        slug: "tools",
        name: { en: "Internal Tools", vi: "Công cụ nội bộ" }
      }
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it("forces an ACTIVE-only filter and applies search", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([activeDoc]);
    webAppRepo.countActive.mockResolvedValue(1);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });

    await service.listUserApps({ search: "blog" });

    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.status).toBe(WEB_APP_STATUSES.ACTIVE);
    expect(filter.$or).toHaveLength(3);
  });

  it("maps docs to UserAppDto and computes pagination meta", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([activeDoc]);
    webAppRepo.countActive.mockResolvedValue(25);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });

    const result = await service.listUserApps({ page: 2, limit: 12 });

    expect(result.items[0]).toEqual({
      _id: "app1",
      displayName: "Blog",
      description: "A blog",
      iconUrl: null,
      homeUrl: "https://blog.example.com",
      categories: [
        {
          _id: "c2",
          slug: "tools",
          name: { en: "Internal Tools", vi: "Công cụ nội bộ" }
        },
        { _id: "c1", slug: "content", name: { en: "Content", vi: "Nội dung" } }
      ],
      isFavorite: false
    });
    expect(result.meta).toEqual({
      total: 25,
      page: 2,
      limit: 12,
      totalPages: 3
    });
    const { skip, limit } = webAppRepo.findActivePaginated.mock.calls[0][1];
    expect(skip).toBe(12);
    expect(limit).toBe(12);
  });

  it("clamps limit to MAX_LIMIT and defaults page/limit", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([]);
    webAppRepo.countActive.mockResolvedValue(0);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });

    const result = await service.listUserApps({ limit: 9999 });

    const { skip, limit } = webAppRepo.findActivePaginated.mock.calls[0][1];
    expect(limit).toBe(100);
    expect(skip).toBe(0);
    expect(result.meta.page).toBe(1);
    // Empty result: zero pages, same as every other paginated endpoint.
    expect(result.meta.totalPages).toBe(0);
  });

  it("matches the category anywhere in categoryIds when filtering", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([]);
    webAppRepo.countActive.mockResolvedValue(0);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });

    await service.listUserApps(
      { categoryId: "64b2f0c2f1a2b3c4d5e6f7a8" },
      "user"
    );

    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.categoryIds).toBe("64b2f0c2f1a2b3c4d5e6f7a8");
  });

  it("omits categoryId from the filter when not provided", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([]);
    webAppRepo.countActive.mockResolvedValue(0);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });

    await service.listUserApps({}, "user");

    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.categoryIds).toBeUndefined();
  });
});

describe("WebAppService.listUserApps access", () => {
  const APP = "64b2f0c2f1a2b3c4d5e6f7b1";

  const setup = () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([]);
    webAppRepo.countActive.mockResolvedValue(0);
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    return { webAppRepo, accessPolicy, service };
  };

  afterEach(() => jest.restoreAllMocks());

  it("resolves the scope of the current user with their role", async () => {
    const { accessPolicy, service } = setup();
    jest.spyOn(RequestContext, "getUserId").mockReturnValue("u1");

    await service.listUserApps({}, "user");

    expect(accessPolicy.resolveScope).toHaveBeenCalledWith("u1", "user");
  });

  it("restricts a user to the role default through $and", async () => {
    const { webAppRepo, service } = setup();
    await service.listUserApps({}, "user");
    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.requiredRoles).toBeUndefined();
    expect(filter.$and).toEqual([
      { $or: [{ requiredRoles: { $size: 0 } }, { requiredRoles: "user" }] }
    ]);
    expect(filter.status).toBe(WEB_APP_STATUSES.ACTIVE);
  });

  it("does not filter an admin with no override (full active catalog)", async () => {
    const { webAppRepo, service } = setup();
    await service.listUserApps({}, "admin");
    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.$and).toBeUndefined();
    expect(filter.status).toBe(WEB_APP_STATUSES.ACTIVE);
  });

  it("drops an app denied to an admin", async () => {
    const { webAppRepo, accessPolicy, service } = setup();
    accessPolicy.resolveScope.mockResolvedValue({
      role: "admin",
      allowIds: [],
      denyIds: [APP]
    });
    await service.listUserApps({}, "admin");
    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.$and).toHaveLength(1);
    expect(filter.$and[0]._id.$nin.map(String)).toEqual([APP]);
  });

  it("keeps the search $or and the access clauses side by side", async () => {
    const { webAppRepo, accessPolicy, service } = setup();
    accessPolicy.resolveScope.mockResolvedValue({
      role: "user",
      allowIds: [APP],
      denyIds: []
    });

    await service.listUserApps({ search: "blog" }, "user");

    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.$or).toHaveLength(3);
    expect(filter.$and[0].$or).toHaveLength(3);
    expect(webAppRepo.countActive.mock.calls[0][0]).toBe(filter);
  });
});

describe("WebAppService.listUserApps isFavorite", () => {
  it("marks isFavorite=true for favorited app ids", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo, accessPolicy } =
      makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([
      {
        _id: { toString: () => "app1" },
        displayName: "A",
        description: null,
        iconUrl: null,
        homeUrl: "h",
        categoryIds: [],
        categories: []
      },
      {
        _id: { toString: () => "app2" },
        displayName: "B",
        description: null,
        iconUrl: null,
        homeUrl: "h",
        categoryIds: [],
        categories: []
      }
    ]);
    webAppRepo.countActive.mockResolvedValue(2);
    favoriteRepo.findFavoritedAppIds.mockResolvedValue(new Set(["app1"]));
    jest.spyOn(RequestContext, "getUserId").mockReturnValue("u1");
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: accessPolicy as any,
      notificationDispatcher: createNotificationDispatcherMock()
    });
    const res = await service.listUserApps({}, "user");
    expect(res.items.find((i) => i._id === "app1")?.isFavorite).toBe(true);
    expect(res.items.find((i) => i._id === "app2")?.isFavorite).toBe(false);
    jest.restoreAllMocks();
  });
});

describe("WebAppService — APP_AVAILABLE announcement", () => {
  const build = (repos: ReturnType<typeof makeRepos>) => {
    const notificationDispatcher = createNotificationDispatcherMock();
    const service = new WebAppService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webAppRepo: repos.webAppRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryRepo: repos.categoryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favoriteRepo: repos.favoriteRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessPolicy: repos.accessPolicy as any,
      notificationDispatcher
    });
    return { service, notificationDispatcher };
  };

  it("announces an app created active to its roles plus admins", async () => {
    const repos = makeRepos();
    repos.webAppRepo.create.mockResolvedValue(createdDoc);
    const { service, notificationDispatcher } = build(repos);

    await service.createApp(validBody);

    expect(repos.webAppRepo.markAnnounced).toHaveBeenCalledWith("app1");
    expect(notificationDispatcher.broadcast).toHaveBeenCalledWith({
      roles: ["user", "admin"],
      type: "APP_AVAILABLE",
      params: { appName: "Blog" },
      link: "/apps?search=Blog",
      dedupeKey: "app:app1"
    });
  });

  it("does not announce an app created hidden", async () => {
    const repos = makeRepos();
    repos.webAppRepo.create.mockResolvedValue({
      ...createdDoc,
      status: WEB_APP_STATUSES.INACTIVE
    });
    const { service, notificationDispatcher } = build(repos);

    await service.createApp({ ...validBody, status: "inactive" });

    expect(repos.webAppRepo.markAnnounced).not.toHaveBeenCalled();
    expect(notificationDispatcher.broadcast).not.toHaveBeenCalled();
  });

  it("announces when a hidden app is published", async () => {
    const repos = makeRepos();
    repos.webAppRepo.findById.mockResolvedValue({
      ...existingDoc,
      status: WEB_APP_STATUSES.INACTIVE
    });
    repos.webAppRepo.updateById.mockResolvedValue(existingDoc);
    const { service, notificationDispatcher } = build(repos);

    await service.updateApp("app1", { status: "active" });

    expect(notificationDispatcher.broadcast).toHaveBeenCalledTimes(1);
  });

  it("does not announce an edit to an app that was already live", async () => {
    const repos = makeRepos();
    repos.webAppRepo.findById.mockResolvedValue(existingDoc);
    repos.webAppRepo.updateById.mockResolvedValue(existingDoc);
    const { service, notificationDispatcher } = build(repos);

    await service.updateApp("app1", { displayName: "Blog 2" });

    expect(repos.webAppRepo.markAnnounced).not.toHaveBeenCalled();
    expect(notificationDispatcher.broadcast).not.toHaveBeenCalled();
  });

  it("announces only once when the app was announced before", async () => {
    const repos = makeRepos();
    repos.webAppRepo.findById.mockResolvedValue({
      ...existingDoc,
      status: WEB_APP_STATUSES.INACTIVE
    });
    repos.webAppRepo.updateById.mockResolvedValue(existingDoc);
    repos.webAppRepo.markAnnounced.mockResolvedValue(false);
    const { service, notificationDispatcher } = build(repos);

    await service.updateApp("app1", { status: "active" });

    expect(notificationDispatcher.broadcast).not.toHaveBeenCalled();
  });

  it("keeps the admin's save when announcing fails", async () => {
    const repos = makeRepos();
    repos.webAppRepo.create.mockResolvedValue(createdDoc);
    repos.webAppRepo.markAnnounced.mockRejectedValue(new Error("mongo down"));
    const { service } = build(repos);

    await expect(service.createApp(validBody)).resolves.toMatchObject({
      clientId: "client_generated"
    });
  });

  it("URL-encodes the app name in the link", async () => {
    const repos = makeRepos();
    repos.webAppRepo.create.mockResolvedValue({
      ...createdDoc,
      displayName: "R&D Tools"
    });
    const { service, notificationDispatcher } = build(repos);

    await service.createApp(validBody);

    expect(notificationDispatcher.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ link: "/apps?search=R%26D%20Tools" })
    );
  });
});
