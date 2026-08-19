jest.mock("@/utils/request-context", () => ({
  RequestContext: { requireUserId: jest.fn(), requireAuthId: jest.fn() }
}));
jest.mock("@/utils/crypto/bcrypt");
jest.mock("@/utils/crypto/temp-password");

// types
import type { UserRepository } from "./user.repository";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
// common
import { ForbiddenError, NotFoundError } from "@/common/exceptions";
// modules
import { EmailType } from "@/types/services/email";
// others
import { RequestContext } from "@/utils/request-context";
import { hashValue } from "@/utils/crypto/bcrypt";
import { generateTempPassword } from "@/utils/crypto/temp-password";
import { createEmailDispatcherMock } from "@test/mocks/email-dispatcher.mock";
import { UserService } from "./user.service";

const mockedHash = hashValue as jest.MockedFunction<typeof hashValue>;
const mockedGenerateTempPassword = generateTempPassword as jest.MockedFunction<
  typeof generateTempPassword
>;

const buildRepo = (over: Partial<UserRepository> = {}): UserRepository =>
  ({
    findAdminUsers: jest.fn(),
    ...over
  }) as unknown as UserRepository;

const buildAuthService = (
  over: Partial<AuthenticationService> = {}
): AuthenticationService =>
  ({
    setActive: jest.fn(),
    findById: jest.fn().mockResolvedValue({ roles: "user", isActive: true }),
    countActiveAdmins: jest.fn().mockResolvedValue(2),
    adminResetPassword: jest.fn().mockResolvedValue(undefined),
    ...over
  }) as unknown as AuthenticationService;

describe("UserService.getAdminUsers", () => {
  it("maps rows to DTOs and computes pagination meta", async () => {
    const findAdminUsers = jest.fn().mockResolvedValue({
      data: [
        {
          _id: { toString: () => "u1" },
          fullName: "A",
          email: "a@e.vn",
          avatar: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          role: "user",
          isActive: true,
          lastLoginAt: null
        }
      ],
      total: 25
    });
    const service = new UserService(
      buildRepo({ findAdminUsers }),
      buildAuthService(),
      createEmailDispatcherMock()
    );

    const result = await service.getAdminUsers({ page: 2, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]._id).toBe("u1");
    expect(result.meta).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3
    });
    expect(findAdminUsers).toHaveBeenCalledWith(
      {},
      { skip: 10, limit: 10, sort: { createdAt: -1 } }
    );
  });

  it("translates status filter to isActive and defaults sort", async () => {
    const findAdminUsers = jest.fn().mockResolvedValue({ data: [], total: 0 });
    const service = new UserService(
      buildRepo({ findAdminUsers }),
      buildAuthService(),
      createEmailDispatcherMock()
    );

    await service.getAdminUsers({
      status: "locked",
      search: "x",
      role: "admin"
    });

    expect(findAdminUsers).toHaveBeenCalledWith(
      { search: "x", role: "admin", isActive: false },
      { skip: 0, limit: 20, sort: { createdAt: -1 } }
    );
  });
});

describe("UserService.setUserActive", () => {
  const targetUserId = "64f1b2c3d4e5f6a7b8c9d0e1";
  const targetAuthId = "64f1b2c3d4e5f6a7b8c9d0e2";
  const adminAuthId = "64f1b2c3d4e5f6a7b8c9d0e3";

  beforeEach(() => {
    jest.mocked(RequestContext.requireAuthId).mockReturnValue(adminAuthId);
  });

  it("locks a non-admin user and returns the result", async () => {
    const findAuthIdById = jest
      .fn()
      .mockResolvedValue({ authId: targetAuthId });
    const setActive = jest.fn().mockResolvedValue(undefined);
    const findById = jest
      .fn()
      .mockResolvedValue({ roles: "user", isActive: true });
    const countActiveAdmins = jest.fn().mockResolvedValue(0);
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive, findById, countActiveAdmins }),
      createEmailDispatcherMock()
    );

    const result = await service.setUserActive(targetUserId, false);

    expect(result).toEqual({ _id: targetUserId, isActive: false });
    expect(setActive).toHaveBeenCalledWith(targetAuthId, false);
  });

  it("locks an admin when other active admins remain", async () => {
    const findAuthIdById = jest
      .fn()
      .mockResolvedValue({ authId: targetAuthId });
    const setActive = jest.fn().mockResolvedValue(undefined);
    const findById = jest
      .fn()
      .mockResolvedValue({ roles: "admin", isActive: true });
    const countActiveAdmins = jest.fn().mockResolvedValue(2);
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive, findById, countActiveAdmins }),
      createEmailDispatcherMock()
    );

    const result = await service.setUserActive(targetUserId, false);

    expect(result).toEqual({ _id: targetUserId, isActive: false });
    expect(setActive).toHaveBeenCalledWith(targetAuthId, false);
  });

  it("throws ForbiddenError when locking the last active admin", async () => {
    const findAuthIdById = jest
      .fn()
      .mockResolvedValue({ authId: targetAuthId });
    const setActive = jest.fn();
    const findById = jest
      .fn()
      .mockResolvedValue({ roles: "admin", isActive: true });
    const countActiveAdmins = jest.fn().mockResolvedValue(1);
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive, findById, countActiveAdmins }),
      createEmailDispatcherMock()
    );

    await expect(service.setUserActive(targetUserId, false)).rejects.toThrow(
      ForbiddenError
    );
    expect(setActive).not.toHaveBeenCalled();
  });

  it("does not consult countActiveAdmins when locking an admin who is already inactive", async () => {
    const findAuthIdById = jest
      .fn()
      .mockResolvedValue({ authId: targetAuthId });
    const setActive = jest.fn().mockResolvedValue(undefined);
    const findById = jest
      .fn()
      .mockResolvedValue({ roles: "admin", isActive: false });
    const countActiveAdmins = jest.fn().mockResolvedValue(0);
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive, findById, countActiveAdmins }),
      createEmailDispatcherMock()
    );

    const result = await service.setUserActive(targetUserId, false);

    expect(result).toEqual({ _id: targetUserId, isActive: false });
    expect(countActiveAdmins).not.toHaveBeenCalled();
    expect(setActive).toHaveBeenCalledWith(targetAuthId, false);
  });

  it("unlocks a user and returns the result", async () => {
    const findAuthIdById = jest
      .fn()
      .mockResolvedValue({ authId: targetAuthId });
    const setActive = jest.fn().mockResolvedValue(undefined);
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive }),
      createEmailDispatcherMock()
    );

    const result = await service.setUserActive(targetUserId, true);

    expect(result).toEqual({ _id: targetUserId, isActive: true });
    expect(setActive).toHaveBeenCalledWith(targetAuthId, true);
  });

  it("throws NotFoundError and does not call setActive when target does not exist", async () => {
    const findAuthIdById = jest.fn().mockResolvedValue(null);
    const setActive = jest.fn();
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive }),
      createEmailDispatcherMock()
    );

    await expect(service.setUserActive(targetUserId, false)).rejects.toThrow(
      NotFoundError
    );
    expect(setActive).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError when an admin tries to lock their own account", async () => {
    const findAuthIdById = jest.fn().mockResolvedValue({ authId: adminAuthId });
    const setActive = jest.fn();
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive }),
      createEmailDispatcherMock()
    );

    await expect(service.setUserActive(targetUserId, false)).rejects.toThrow(
      ForbiddenError
    );
    expect(setActive).not.toHaveBeenCalled();
  });

  it("allows an admin to unlock their own account", async () => {
    const findAuthIdById = jest.fn().mockResolvedValue({ authId: adminAuthId });
    const setActive = jest.fn().mockResolvedValue(undefined);
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive }),
      createEmailDispatcherMock()
    );

    const result = await service.setUserActive(targetUserId, true);

    expect(result).toEqual({ _id: targetUserId, isActive: true });
    expect(setActive).toHaveBeenCalledWith(adminAuthId, true);
  });

  it("is idempotent — calls setActive even if the account is already in the target state", async () => {
    const findAuthIdById = jest
      .fn()
      .mockResolvedValue({ authId: targetAuthId });
    const setActive = jest.fn().mockResolvedValue(undefined);
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive }),
      createEmailDispatcherMock()
    );

    await service.setUserActive(targetUserId, false);
    await service.setUserActive(targetUserId, false);

    expect(setActive).toHaveBeenCalledTimes(2);
    expect(setActive).toHaveBeenNthCalledWith(1, targetAuthId, false);
    expect(setActive).toHaveBeenNthCalledWith(2, targetAuthId, false);
  });

  it("unlocking the last active admin is never blocked by the last-admin guard", async () => {
    const findAuthIdById = jest
      .fn()
      .mockResolvedValue({ authId: targetAuthId });
    const setActive = jest.fn().mockResolvedValue(undefined);
    const findById = jest
      .fn()
      .mockResolvedValue({ roles: "admin", isActive: false });
    const countActiveAdmins = jest.fn().mockResolvedValue(1);
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ setActive, findById, countActiveAdmins }),
      createEmailDispatcherMock()
    );

    const result = await service.setUserActive(targetUserId, true);

    expect(result).toEqual({ _id: targetUserId, isActive: true });
    expect(findById).not.toHaveBeenCalled();
    expect(countActiveAdmins).not.toHaveBeenCalled();
    expect(setActive).toHaveBeenCalledWith(targetAuthId, true);
  });
});

describe("UserService.adminResetPassword", () => {
  const targetUserId = "64f1b2c3d4e5f6a7b8c9d0e1";
  const targetAuthId = "64f1b2c3d4e5f6a7b8c9d0e2";
  const adminAuthId = "64f1b2c3d4e5f6a7b8c9d0e3";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(RequestContext.requireAuthId).mockReturnValue(adminAuthId);
    mockedGenerateTempPassword.mockReturnValue("Temp1234!@");
    mockedHash.mockReturnValue("hashedTemp");
  });

  it("generates a temp password, resets it via authService, emails the user, and returns {_id, email}", async () => {
    const findAuthIdById = jest.fn().mockResolvedValue({
      authId: targetAuthId,
      email: "target@e.vn"
    });
    const adminResetPassword = jest.fn().mockResolvedValue(undefined);
    const emailDispatcher = createEmailDispatcherMock();
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ adminResetPassword }),
      emailDispatcher
    );

    const result = await service.adminResetPassword(targetUserId);

    expect(mockedGenerateTempPassword).toHaveBeenCalled();
    expect(adminResetPassword).toHaveBeenCalledWith(targetAuthId, "hashedTemp");
    expect(emailDispatcher.send).toHaveBeenCalledWith(
      EmailType.ADMIN_RESET_PASSWORD,
      expect.objectContaining({
        email: "target@e.vn",
        data: expect.objectContaining({ tempPassword: "Temp1234!@" })
      })
    );
    expect(result).toEqual({ _id: targetUserId, email: "target@e.vn" });
  });

  it("throws ForbiddenError with ADMIN_CANNOT_RESET_SELF when the admin resets their own account", async () => {
    const findAuthIdById = jest
      .fn()
      .mockResolvedValue({ authId: adminAuthId, email: "admin@e.vn" });
    const adminResetPassword = jest.fn();
    const emailDispatcher = createEmailDispatcherMock();
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ adminResetPassword }),
      emailDispatcher
    );

    await expect(service.adminResetPassword(targetUserId)).rejects.toThrow(
      ForbiddenError
    );
    expect(adminResetPassword).not.toHaveBeenCalled();
    expect(emailDispatcher.send).not.toHaveBeenCalled();
  });

  it("throws NotFoundError with USER_NOT_FOUND when the target does not exist", async () => {
    const findAuthIdById = jest.fn().mockResolvedValue(null);
    const adminResetPassword = jest.fn();
    const emailDispatcher = createEmailDispatcherMock();
    const service = new UserService(
      buildRepo({ findAuthIdById }),
      buildAuthService({ adminResetPassword }),
      emailDispatcher
    );

    await expect(service.adminResetPassword(targetUserId)).rejects.toThrow(
      NotFoundError
    );
    expect(adminResetPassword).not.toHaveBeenCalled();
    expect(emailDispatcher.send).not.toHaveBeenCalled();
  });
});
