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
