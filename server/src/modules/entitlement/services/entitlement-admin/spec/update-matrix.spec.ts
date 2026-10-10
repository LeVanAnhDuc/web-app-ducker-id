// service
import { EntitlementAdminService } from "../";
// common
import { NotFoundError } from "@/common/exceptions";
// others
import {
  ACTOR_ID,
  ADMIN_ID,
  BLOG_ID,
  CATALOG,
  OPS_ID,
  USER_ID,
  makeDeps
} from "./make-deps";

describe("EntitlementAdminService.updateMatrix", () => {
  const setup = () => {
    const ctx = makeDeps();
    ctx.userRepo.findRolesByIds.mockResolvedValue([
      { userId: USER_ID, role: "user" },
      { userId: ADMIN_ID, role: "admin" }
    ]);
    ctx.webAppRepo.findAccessRules.mockImplementation(async (ids?: string[]) =>
      ids ? CATALOG.filter((app) => ids.includes(app._id.toString())) : CATALOG
    );
    ctx.entitlementRepo.findByUsers.mockResolvedValue([]);
    ctx.entitlementRepo.applyChanges.mockResolvedValue(undefined);
    return { ...ctx, service: new EntitlementAdminService(ctx.deps) };
  };

  // Decision table: role default × requested value → stored override.
  it.each([
    [
      "user revoked from an app the role grants",
      USER_ID,
      BLOG_ID,
      false,
      "deny"
    ],
    ["user granted an app the role withholds", USER_ID, OPS_ID, true, "allow"],
    ["admin revoked from an app", ADMIN_ID, OPS_ID, false, "deny"]
  ])("%s → upserts %s", async (_label, userId, appId, granted, effect) => {
    const { service, entitlementRepo } = setup();

    await service.updateMatrix([{ userId, appId, granted }], ACTOR_ID);

    expect(entitlementRepo.applyChanges).toHaveBeenCalledWith({
      upserts: [{ userId, webAppId: appId, effect, updatedBy: ACTOR_ID }],
      deletes: []
    });
  });

  it.each([
    ["user granted an app the role already grants", USER_ID, BLOG_ID, true],
    [
      "user revoked from an app the role already withholds",
      USER_ID,
      OPS_ID,
      false
    ],
    ["admin granted an app", ADMIN_ID, OPS_ID, true]
  ])(
    "%s → deletes the override instead of storing a redundant one",
    async (_label, userId, appId, granted) => {
      const { service, entitlementRepo } = setup();

      await service.updateMatrix([{ userId, appId, granted }], ACTOR_ID);

      expect(entitlementRepo.applyChanges).toHaveBeenCalledWith({
        upserts: [],
        deletes: [{ userId, webAppId: appId }]
      });
    }
  );

  it("returns the fresh rows of the affected users only, in first-seen order", async () => {
    const { service, entitlementRepo, userRepo } = setup();
    entitlementRepo.findByUsers.mockResolvedValue([
      { userId: USER_ID, webAppId: OPS_ID, effect: "allow" }
    ]);

    const dto = await service.updateMatrix(
      [
        { userId: USER_ID, appId: OPS_ID, granted: true },
        { userId: USER_ID, appId: BLOG_ID, granted: true }
      ],
      ACTOR_ID
    );

    expect(userRepo.findRolesByIds).toHaveBeenCalledWith([USER_ID]);
    expect(entitlementRepo.findByUsers).toHaveBeenCalledWith([USER_ID]);
    expect(dto.users).toEqual([
      {
        userId: USER_ID,
        grantedAppIds: [BLOG_ID, OPS_ID],
        overriddenAppIds: [OPS_ID]
      }
    ]);
  });

  it("404s on an unknown user anywhere in the batch and writes nothing", async () => {
    const { service, userRepo, entitlementRepo } = setup();
    userRepo.findRolesByIds.mockResolvedValue([
      { userId: USER_ID, role: "user" }
    ]);

    await expect(
      service.updateMatrix(
        [
          { userId: USER_ID, appId: BLOG_ID, granted: false },
          { userId: ADMIN_ID, appId: BLOG_ID, granted: false }
        ],
        ACTOR_ID
      )
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(entitlementRepo.applyChanges).not.toHaveBeenCalled();
  });

  it("404s on an unknown app in the last change and writes nothing", async () => {
    const { service, entitlementRepo } = setup();

    await expect(
      service.updateMatrix(
        [
          { userId: USER_ID, appId: BLOG_ID, granted: false },
          {
            userId: USER_ID,
            appId: "64b2f0c2f1a2b3c4d5e6f7ff",
            granted: true
          }
        ],
        ACTOR_ID
      )
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(entitlementRepo.applyChanges).not.toHaveBeenCalled();
  });
});

describe("EntitlementAdminService.updateMatrix — access notifications", () => {
  const APPS = [
    { _id: BLOG_ID, displayName: "Blog", status: "ACTIVE" },
    { _id: OPS_ID, displayName: "Operations Console", status: "ACTIVE" }
  ];

  const setup = (overridesBefore: object[] = []) => {
    const ctx = makeDeps();
    ctx.userRepo.findRolesByIds.mockResolvedValue([
      { userId: USER_ID, role: "user" },
      { userId: ADMIN_ID, role: "admin" }
    ]);
    ctx.webAppRepo.findAccessRules.mockImplementation(async (ids?: string[]) =>
      ids ? CATALOG.filter((app) => ids.includes(app._id.toString())) : CATALOG
    );
    ctx.webAppRepo.findAll.mockResolvedValue(APPS);
    // First read is the state before the write, the second rebuilds the matrix.
    ctx.entitlementRepo.findByUsers
      .mockResolvedValueOnce(overridesBefore)
      .mockResolvedValue([]);
    ctx.entitlementRepo.applyChanges.mockResolvedValue(undefined);
    return { ...ctx, service: new EntitlementAdminService(ctx.deps) };
  };

  it("tells a user they lost an app the role gave them, with no link", async () => {
    const { service, notificationDispatcher } = setup();

    await service.updateMatrix(
      [{ userId: USER_ID, appId: BLOG_ID, granted: false }],
      ACTOR_ID
    );

    expect(notificationDispatcher.notify).toHaveBeenCalledWith({
      userId: USER_ID,
      type: "ENTITLEMENT_REVOKED",
      params: { appName: "Blog" },
      link: null
    });
  });

  it("tells a user they gained an app beyond their role, linking to it", async () => {
    const { service, notificationDispatcher } = setup();

    await service.updateMatrix(
      [{ userId: USER_ID, appId: OPS_ID, granted: true }],
      ACTOR_ID
    );

    expect(notificationDispatcher.notify).toHaveBeenCalledWith({
      userId: USER_ID,
      type: "ENTITLEMENT_GRANTED",
      params: { appName: "Operations Console" },
      link: "/apps?search=Operations%20Console"
    });
  });

  it("tells a user an app is back when a deny override is removed", async () => {
    const { service, notificationDispatcher } = setup([
      { userId: USER_ID, webAppId: BLOG_ID, effect: "deny" }
    ]);

    await service.updateMatrix(
      [{ userId: USER_ID, appId: BLOG_ID, granted: true }],
      ACTOR_ID
    );

    expect(notificationDispatcher.notify).toHaveBeenCalledTimes(1);
    expect(notificationDispatcher.notify.mock.calls[0][0].type).toBe(
      "ENTITLEMENT_GRANTED"
    );
  });

  // Decision table: the pairs whose effective access does not move.
  it.each([
    ["re-granting an app the role already gives", [], USER_ID, BLOG_ID, true],
    [
      "re-saving an allow override as granted",
      [{ userId: USER_ID, webAppId: OPS_ID, effect: "allow" }],
      USER_ID,
      OPS_ID,
      true
    ],
    ["granting an admin anything", [], ADMIN_ID, OPS_ID, true]
  ])("stays silent when %s", async (_label, before, userId, appId, granted) => {
    const { service, notificationDispatcher, webAppRepo } = setup(before);

    await service.updateMatrix([{ userId, appId, granted }], ACTOR_ID);

    expect(notificationDispatcher.notify).not.toHaveBeenCalled();
    expect(webAppRepo.findAll).not.toHaveBeenCalled();
  });

  it("stays silent about an app that is not active", async () => {
    const { service, notificationDispatcher, webAppRepo } = setup();
    webAppRepo.findAll.mockResolvedValue([
      { _id: BLOG_ID, displayName: "Blog", status: "INACTIVE" }
    ]);

    await service.updateMatrix(
      [{ userId: USER_ID, appId: BLOG_ID, granted: false }],
      ACTOR_ID
    );

    expect(notificationDispatcher.notify).not.toHaveBeenCalled();
  });

  it("notifies only after the write, and a failed name lookup keeps the save", async () => {
    const { service, notificationDispatcher, webAppRepo, entitlementRepo } =
      setup();
    webAppRepo.findAll.mockRejectedValue(new Error("db down"));

    await expect(
      service.updateMatrix(
        [{ userId: USER_ID, appId: BLOG_ID, granted: false }],
        ACTOR_ID
      )
    ).resolves.toBeDefined();
    expect(entitlementRepo.applyChanges).toHaveBeenCalled();
    expect(notificationDispatcher.notify).not.toHaveBeenCalled();
  });

  it("does not notify when the write fails", async () => {
    const { service, notificationDispatcher, entitlementRepo } = setup();
    entitlementRepo.applyChanges.mockRejectedValue(new Error("write failed"));

    await expect(
      service.updateMatrix(
        [{ userId: USER_ID, appId: BLOG_ID, granted: false }],
        ACTOR_ID
      )
    ).rejects.toThrow("write failed");
    expect(notificationDispatcher.notify).not.toHaveBeenCalled();
  });
});
