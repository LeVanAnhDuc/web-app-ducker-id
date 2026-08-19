// types
import type { AdminUserAggregateRow } from "@/modules/user/types";
// dtos
import { toAdminUserDto } from "./admin-user-item.dto";

const baseRow = (): AdminUserAggregateRow => ({
  _id: { toString: () => "user1" } as unknown as AdminUserAggregateRow["_id"],
  fullName: "Alice",
  email: "alice@example.com",
  avatar: null,
  createdAt: new Date("2026-01-10T10:00:00.000Z"),
  role: "admin",
  isActive: true,
  lastLoginAt: new Date("2026-05-24T08:12:00.000Z")
});

describe("toAdminUserDto", () => {
  it("maps all fields and serialises dates to ISO strings", () => {
    expect(toAdminUserDto(baseRow())).toEqual({
      _id: "user1",
      fullName: "Alice",
      email: "alice@example.com",
      avatar: null,
      role: "admin",
      isActive: true,
      lastLoginAt: "2026-05-24T08:12:00.000Z",
      createdAt: "2026-01-10T10:00:00.000Z"
    });
  });

  it("returns null lastLoginAt when user never logged in", () => {
    const dto = toAdminUserDto({ ...baseRow(), lastLoginAt: null });
    expect(dto.lastLoginAt).toBeNull();
  });

  it("coerces undefined avatar to null", () => {
    const dto = toAdminUserDto({ ...baseRow(), avatar: undefined });
    expect(dto.avatar).toBeNull();
  });
});
