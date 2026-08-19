// types
import type { AuthenticationRepository } from "./authentication.repository";
import { AuthenticationService } from "./authentication.service";
// common
import { BadRequestError } from "@/common/exceptions";

const buildRepo = (
  over: Partial<AuthenticationRepository> = {}
): AuthenticationRepository =>
  ({
    setActive: jest.fn(),
    countActiveAdmins: jest.fn(),
    adminResetPassword: jest.fn(),
    ...over
  }) as unknown as AuthenticationRepository;

describe("AuthenticationService.setActive", () => {
  it("rejects an invalid authId before touching the repository", async () => {
    const setActive = jest.fn();
    const service = new AuthenticationService(buildRepo({ setActive }));

    await expect(service.setActive("not-an-id", false)).rejects.toThrow(
      BadRequestError
    );
    expect(setActive).not.toHaveBeenCalled();
  });

  it("calls the repository with the given authId and isActive flag", async () => {
    const setActive = jest.fn().mockResolvedValue(undefined);
    const service = new AuthenticationService(buildRepo({ setActive }));
    const authId = "64f1b2c3d4e5f6a7b8c9d0e1";

    await service.setActive(authId, false);

    expect(setActive).toHaveBeenCalledWith(authId, false);
  });

  it("propagates repository errors", async () => {
    const setActive = jest.fn().mockRejectedValue(new Error("db down"));
    const service = new AuthenticationService(buildRepo({ setActive }));
    const authId = "64f1b2c3d4e5f6a7b8c9d0e1";

    await expect(service.setActive(authId, true)).rejects.toThrow("db down");
  });
});

describe("AuthenticationService.countActiveAdmins", () => {
  it("returns the count from the repository", async () => {
    const countActiveAdmins = jest.fn().mockResolvedValue(3);
    const service = new AuthenticationService(buildRepo({ countActiveAdmins }));

    const result = await service.countActiveAdmins();

    expect(result).toBe(3);
    expect(countActiveAdmins).toHaveBeenCalledWith();
  });

  it("propagates repository errors", async () => {
    const countActiveAdmins = jest.fn().mockRejectedValue(new Error("db down"));
    const service = new AuthenticationService(buildRepo({ countActiveAdmins }));

    await expect(service.countActiveAdmins()).rejects.toThrow("db down");
  });
});

describe("AuthenticationService.adminResetPassword", () => {
  it("rejects an invalid authId before touching the repository", async () => {
    const adminResetPassword = jest.fn();
    const service = new AuthenticationService(
      buildRepo({ adminResetPassword })
    );

    await expect(
      service.adminResetPassword("not-an-id", "hash")
    ).rejects.toThrow(BadRequestError);
    expect(adminResetPassword).not.toHaveBeenCalled();
  });

  it("calls the repository with the given authId and hashed password", async () => {
    const adminResetPassword = jest.fn().mockResolvedValue(undefined);
    const service = new AuthenticationService(
      buildRepo({ adminResetPassword })
    );
    const authId = "64f1b2c3d4e5f6a7b8c9d0e1";

    await service.adminResetPassword(authId, "newHash");

    expect(adminResetPassword).toHaveBeenCalledWith(authId, "newHash");
  });

  it("propagates repository errors", async () => {
    const adminResetPassword = jest
      .fn()
      .mockRejectedValue(new Error("db down"));
    const service = new AuthenticationService(
      buildRepo({ adminResetPassword })
    );
    const authId = "64f1b2c3d4e5f6a7b8c9d0e1";

    await expect(service.adminResetPassword(authId, "newHash")).rejects.toThrow(
      "db down"
    );
  });
});
