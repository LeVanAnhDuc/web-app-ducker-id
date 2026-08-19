// types
import type { ContactRepository } from "./contact-admin.repository";
// modules
import { ContactAdminService } from "./contact-admin.service";
import { CONTACT_STATUSES, CONTACT_PRIORITIES } from "./constants";
import { NotFoundError } from "@/common/exceptions";
import { RequestContext } from "@/utils/request-context";

const USER = "507f1f77bcf86cd799439011";
const OTHER_USER = "507f1f77bcf86cd799439099";

const makeDoc = (overrides: Partial<Record<string, unknown>> = {}) => ({
  _id: { toString: () => overrides.id ?? "contact1" },
  email: null,
  subject: "Subject",
  message: "Message body long enough to pass validation",
  priority: CONTACT_PRIORITIES.MEDIUM,
  status: CONTACT_STATUSES.NEW,
  userId: null,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  ...overrides
});

const makeDeps = () => {
  const contactRepo = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    findByUser: jest.fn(),
    findByIdForUser: jest.fn()
  };
  const makeService = () =>
    new ContactAdminService(contactRepo as unknown as ContactRepository);
  return { contactRepo, makeService };
};

describe("ContactAdminService", () => {
  afterEach(() => jest.restoreAllMocks());

  describe("submitContact", () => {
    it("attaches userId from RequestContext when caller is authenticated", async () => {
      jest.spyOn(RequestContext, "getUserId").mockReturnValue(USER);
      const { contactRepo, makeService } = makeDeps();
      contactRepo.create.mockResolvedValue(makeDoc({ userId: USER }));
      const svc = makeService();

      await svc.submitContact({
        subject: "Cannot login",
        message: "This is a long enough message for validation to pass."
      });

      expect(contactRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER })
      );
    });

    it("sets userId null for a guest (unauthenticated) submit", async () => {
      jest.spyOn(RequestContext, "getUserId").mockReturnValue(undefined);
      const { contactRepo, makeService } = makeDeps();
      contactRepo.create.mockResolvedValue(makeDoc({ userId: null }));
      const svc = makeService();

      await svc.submitContact({
        subject: "Cannot login",
        message: "This is a long enough message for validation to pass."
      });

      expect(contactRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null })
      );
    });
  });

  describe("getMyContacts", () => {
    it("scopes the query to the given userId and maps pagination meta", async () => {
      const { contactRepo, makeService } = makeDeps();
      contactRepo.findByUser.mockResolvedValue({
        data: [makeDoc({ id: "c1", userId: USER })],
        total: 1
      });
      const svc = makeService();

      const res = await svc.getMyContacts(USER, {});

      expect(contactRepo.findByUser).toHaveBeenCalledWith(
        USER,
        expect.any(Object),
        expect.objectContaining({ skip: 0, limit: 20 })
      );
      expect(res.items).toHaveLength(1);
      expect(res.items[0]._id).toBe("c1");
      expect(res.meta.total).toBe(1);
    });

    it("never asks the repository for another user's contacts", async () => {
      const { contactRepo, makeService } = makeDeps();
      contactRepo.findByUser.mockResolvedValue({ data: [], total: 0 });
      const svc = makeService();

      await svc.getMyContacts(OTHER_USER, { status: "processing" });

      expect(contactRepo.findByUser).toHaveBeenCalledWith(
        OTHER_USER,
        expect.objectContaining({ status: "processing" }),
        expect.any(Object)
      );
    });
  });

  describe("getMyContactDetail", () => {
    it("returns the contact detail when it belongs to the caller", async () => {
      const { contactRepo, makeService } = makeDeps();
      contactRepo.findByIdForUser.mockResolvedValue(
        makeDoc({ id: "c1", userId: USER })
      );
      const svc = makeService();

      const res = await svc.getMyContactDetail("c1", USER);

      expect(contactRepo.findByIdForUser).toHaveBeenCalledWith("c1", USER);
      expect(res._id).toBe("c1");
    });

    it("throws NotFoundError (no leak) when contact belongs to another user or is absent", async () => {
      const { contactRepo, makeService } = makeDeps();
      contactRepo.findByIdForUser.mockResolvedValue(null);
      const svc = makeService();

      await expect(
        svc.getMyContactDetail("c1", OTHER_USER)
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
