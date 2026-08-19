// types
import type { AdminUser } from "@/types/AdminUsers";

const SIMULATED_LATENCY_MS = 200;

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(value), SIMULATED_LATENCY_MS)
  );

const MOCK_USERS: AdminUser[] = [
  {
    _id: "user_alice",
    fullName: "Alice Nguyễn",
    email: "alice@example.com",
    avatar: null,
    role: "admin",
    isActive: true,
    lastLoginAt: "2026-05-24T08:12:00.000Z",
    createdAt: "2026-01-10T10:00:00.000Z"
  },
  {
    _id: "user_bob",
    fullName: "Bob Trần",
    email: "bob@example.com",
    avatar: null,
    role: "user",
    isActive: true,
    lastLoginAt: "2026-05-22T17:45:00.000Z",
    createdAt: "2026-02-15T09:30:00.000Z"
  },
  {
    _id: "user_carol",
    fullName: "Carol Phạm",
    email: "carol@example.com",
    avatar: null,
    role: "user",
    isActive: false,
    lastLoginAt: "2026-04-02T11:20:00.000Z",
    createdAt: "2026-03-01T14:15:00.000Z"
  },
  {
    _id: "user_dave",
    fullName: "Dave Lê",
    email: "dave@example.com",
    avatar: null,
    role: "user",
    isActive: true,
    lastLoginAt: null,
    createdAt: "2026-05-18T16:00:00.000Z"
  }
];

export const getAdminUsers = async (): Promise<AdminUser[]> =>
  delay(MOCK_USERS);

export const getAdminUserById = async (
  id: string
): Promise<AdminUser | null> => {
  const user = MOCK_USERS.find((u) => u._id === id) ?? null;
  return delay(user);
};

export const forceLogoutAdminUser = async (
  id: string
): Promise<{ id: string; sessionsRevoked: number }> => {
  const user = MOCK_USERS.find((u) => u._id === id);
  if (!user) throw new Error(`User ${id} not found`);
  const FAKE_SESSIONS_COUNT = 2;
  return delay({ id, sessionsRevoked: FAKE_SESSIONS_COUNT });
};

export const MOCK_ADMIN_USERS: AdminUser[] = MOCK_USERS;
