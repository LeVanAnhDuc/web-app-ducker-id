// service
import { EntitlementAdminService } from "../";
// common
import { NotFoundError } from "@/common/exceptions";
// others
import {
  ADMIN_ID,
  BLOG_ID,
  CATALOG,
  OPS_ID,
  USER_ID,
  makeDeps
} from "./make-deps";

describe("EntitlementAdminService.getMatrix", () => {
  const setup = () => {
    const ctx = makeDeps();
    ctx.userRepo.findRolesByIds.mockResolvedValue([
      { userId: USER_ID, role: "user" },
      { userId: ADMIN_ID, role: "admin" }
    ]);
    ctx.webAppRepo.findAccessRules.mockResolvedValue(CATALOG);
    ctx.entitlementRepo.findByUsers.mockResolvedValue([]);
    return { ...ctx, service: new EntitlementAdminService(ctx.deps) };
  };

  it("returns one row per requested user, in request order, against the whole catalog", async () => {
    const { service, webAppRepo } = setup();

    const dto = await service.getMatrix([ADMIN_ID, USER_ID]);

    expect(webAppRepo.findAccessRules).toHaveBeenCalledWith();
    expect(dto.users).toEqual([
      {
        userId: ADMIN_ID,
        grantedAppIds: [BLOG_ID, OPS_ID],
        overriddenAppIds: []
      },
      { userId: USER_ID, grantedAppIds: [BLOG_ID], overriddenAppIds: [] }
    ]);
  });

  it("applies each user's overrides to their own row only", async () => {
    const { service, entitlementRepo } = setup();
    entitlementRepo.findByUsers.mockResolvedValue([
      { userId: USER_ID, webAppId: BLOG_ID, effect: "deny" },
      { userId: USER_ID, webAppId: OPS_ID, effect: "allow" }
    ]);

    const dto = await service.getMatrix([USER_ID, ADMIN_ID]);

    expect(dto.users[0]).toEqual({
      userId: USER_ID,
      grantedAppIds: [OPS_ID],
      overriddenAppIds: [BLOG_ID, OPS_ID]
    });
    expect(dto.users[1].overriddenAppIds).toEqual([]);
  });

  it("404s when one of the users does not exist", async () => {
    const { service, userRepo, entitlementRepo } = setup();
    userRepo.findRolesByIds.mockResolvedValue([
      { userId: USER_ID, role: "user" }
    ]);

    await expect(service.getMatrix([USER_ID, ADMIN_ID])).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(entitlementRepo.findByUsers).not.toHaveBeenCalled();
  });
});
