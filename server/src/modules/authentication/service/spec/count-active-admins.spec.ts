// types
import type { AuthenticationRepository } from "../../repository/authentication.repository";
// others
import { AuthenticationService } from "../";

const buildRepo = (countActiveAdmins: jest.Mock): AuthenticationRepository =>
  ({ countActiveAdmins }) as unknown as AuthenticationRepository;

describe("AuthenticationService.countActiveAdmins", () => {
  it("returns the count from the repository", async () => {
    const countActiveAdmins = jest.fn().mockResolvedValue(3);
    const service = new AuthenticationService(buildRepo(countActiveAdmins));

    const result = await service.countActiveAdmins();

    expect(result).toBe(3);
    expect(countActiveAdmins).toHaveBeenCalledWith();
  });

  it("propagates repository errors", async () => {
    const countActiveAdmins = jest.fn().mockRejectedValue(new Error("db down"));
    const service = new AuthenticationService(buildRepo(countActiveAdmins));

    await expect(service.countActiveAdmins()).rejects.toThrow("db down");
  });
});
