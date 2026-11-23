// types
import type { AuthenticationRepository } from "./repository/authentication.repository";
// others
import { AuthenticationService } from "./authentication.service";

const buildRepo = (setActive: jest.Mock): AuthenticationRepository =>
  ({ setActive }) as unknown as AuthenticationRepository;

describe("AuthenticationService.setActive", () => {
  it("calls the repository with the given authId and isActive flag", async () => {
    const setActive = jest.fn().mockResolvedValue(undefined);
    const service = new AuthenticationService(buildRepo(setActive));
    const authId = "64f1b2c3d4e5f6a7b8c9d0e1";

    await service.setActive(authId, false);

    expect(setActive).toHaveBeenCalledWith(authId, false);
  });

  it("propagates repository errors", async () => {
    const setActive = jest.fn().mockRejectedValue(new Error("db down"));
    const service = new AuthenticationService(buildRepo(setActive));
    const authId = "64f1b2c3d4e5f6a7b8c9d0e1";

    await expect(service.setActive(authId, true)).rejects.toThrow("db down");
  });
});
