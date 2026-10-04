// types
import type { AuthenticationRepository } from "../../repository/authentication.repository";
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { AuthenticationService } from "../";

const buildRepo = (adminResetPassword: jest.Mock): AuthenticationRepository =>
  ({ adminResetPassword }) as unknown as AuthenticationRepository;

describe("AuthenticationService.adminResetPassword", () => {
  it("rejects an invalid authId before touching the repository", async () => {
    const adminResetPassword = jest.fn();
    const service = new AuthenticationService(buildRepo(adminResetPassword));

    await expect(
      service.adminResetPassword("not-an-id", "hash")
    ).rejects.toThrow(BadRequestError);
    expect(adminResetPassword).not.toHaveBeenCalled();
  });

  it("calls the repository with the given authId and hashed password", async () => {
    const adminResetPassword = jest.fn().mockResolvedValue(undefined);
    const service = new AuthenticationService(buildRepo(adminResetPassword));
    const authId = "64f1b2c3d4e5f6a7b8c9d0e1";

    await service.adminResetPassword(authId, "newHash");

    expect(adminResetPassword).toHaveBeenCalledWith(authId, "newHash");
  });

  it("propagates repository errors", async () => {
    const adminResetPassword = jest
      .fn()
      .mockRejectedValue(new Error("db down"));
    const service = new AuthenticationService(buildRepo(adminResetPassword));
    const authId = "64f1b2c3d4e5f6a7b8c9d0e1";

    await expect(service.adminResetPassword(authId, "newHash")).rejects.toThrow(
      "db down"
    );
  });
});
