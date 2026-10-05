// types
import type { EntitlementRepository } from "../../../repository/entitlement.repository";
// service
import { AccessPolicy } from "../";

const USER_ID = "64b2f0c2f1a2b3c4d5e6f7c1";

describe("AccessPolicy.resolveScope", () => {
  const setup = () => {
    const repo = {
      findByUser: jest.fn(),
      findByUsers: jest.fn(),
      applyChanges: jest.fn()
    };
    const policy = new AccessPolicy(repo as unknown as EntitlementRepository);
    return { repo, policy };
  };

  it("splits the user's overrides into allow and deny lists", async () => {
    const { repo, policy } = setup();
    repo.findByUser.mockResolvedValue([
      { userId: USER_ID, webAppId: "a1", effect: "allow" },
      { userId: USER_ID, webAppId: "d1", effect: "deny" },
      { userId: USER_ID, webAppId: "a2", effect: "allow" }
    ]);

    await expect(policy.resolveScope(USER_ID, "user")).resolves.toEqual({
      role: "user",
      allowIds: ["a1", "a2"],
      denyIds: ["d1"]
    });
    expect(repo.findByUser).toHaveBeenCalledWith(USER_ID);
  });

  it("skips the lookup when there is no user and falls back to the role default", async () => {
    const { repo, policy } = setup();

    await expect(policy.resolveScope(undefined, "user")).resolves.toEqual({
      role: "user",
      allowIds: [],
      denyIds: []
    });
    expect(repo.findByUser).not.toHaveBeenCalled();
  });
});
