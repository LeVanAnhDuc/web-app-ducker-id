// libs
import { NotFoundError } from "@/common/exceptions";
// modules
import { NotificationService } from "./notification.service";
import { RequestContext } from "@/utils/request-context";

const baseDoc = {
  _id: { toString: () => "n1" },
  type: "SYSTEM_ANNOUNCEMENT",
  title: "T",
  message: "M",
  meta: null,
  isRead: false,
  readAt: null,
  createdAt: new Date("2026-06-09T00:00:00Z")
};

const makeRepo = () => ({
  findByUser: jest.fn().mockResolvedValue({ data: [baseDoc], total: 1 }),
  countUnread: jest.fn().mockResolvedValue(3),
  markRead: jest.fn().mockResolvedValue(baseDoc),
  markAllRead: jest.fn().mockResolvedValue(2)
});

describe("NotificationService", () => {
  const USER = "507f1f77bcf86cd799439011";
  beforeEach(() => {
    jest.spyOn(RequestContext, "requireUserId").mockReturnValue(USER);
  });
  afterEach(() => jest.restoreAllMocks());

  it("returns paginated items with meta", async () => {
    const repo = makeRepo();
    const svc = new NotificationService(repo);
    const res = await svc.list({ page: 1, limit: 20 });
    expect(res.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    expect(res.items[0].id).toBe("n1");
    expect(repo.findByUser).toHaveBeenCalledWith(
      { userId: USER },
      { skip: 0, limit: 20, sort: { createdAt: -1 } }
    );
  });

  it("passes isRead filter through", async () => {
    const repo = makeRepo();
    const svc = new NotificationService(repo);
    await svc.list({ isRead: false });
    expect(repo.findByUser).toHaveBeenCalledWith(
      { userId: USER, isRead: false },
      expect.anything()
    );
  });

  it("returns unread count", async () => {
    const repo = makeRepo();
    const svc = new NotificationService(repo);
    expect(await svc.unreadCount()).toEqual({ count: 3 });
  });

  it("throws NotFound when marking a foreign/missing id", async () => {
    const repo = makeRepo();
    repo.markRead.mockResolvedValue(null);
    const svc = new NotificationService(repo);
    await expect(svc.markRead("nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("marks all read", async () => {
    const repo = makeRepo();
    const svc = new NotificationService(repo);
    expect(await svc.markAllRead()).toEqual({ updated: 2 });
  });
});
