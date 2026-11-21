// libs
import { Types } from "mongoose";
// common
import { toDto } from "@/common/dto";
// dtos
import { NotificationItemDto } from ".";

const id = new Types.ObjectId("64f1b2c3d4e5f6a7b8c9d0e1");
const createdAt = new Date("2026-11-01T10:00:00.000Z");
const readAt = new Date("2026-11-02T11:00:00.000Z");

const record = {
  _id: id,
  userId: new Types.ObjectId(),
  type: "PASSWORD_CHANGED",
  category: "security",
  params: { device: "Chrome" },
  link: "/settings/security",
  isRead: true,
  readAt,
  dedupeKey: "x",
  createdAt,
  __v: 0
};

describe("NotificationItemDto", () => {
  it("maps exactly the client fields, with id instead of _id", () => {
    expect(toDto(NotificationItemDto, record)).toStrictEqual({
      id: id.toString(),
      type: "PASSWORD_CHANGED",
      category: "security",
      params: { device: "Chrome" },
      link: "/settings/security",
      isRead: true,
      readAt: readAt.toISOString(),
      createdAt: createdAt.toISOString()
    });
  });

  it("fills an unread row without params or link", () => {
    const dto = toDto(NotificationItemDto, {
      ...record,
      params: undefined,
      link: undefined,
      isRead: false,
      readAt: undefined
    });
    expect(dto).toMatchObject({ params: {}, link: null, readAt: null });
  });
});
