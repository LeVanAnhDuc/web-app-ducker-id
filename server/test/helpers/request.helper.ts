// types
import type { Request } from "express";

type MockRequestOverrides = {
  language?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socketAddress?: string;
  userAgent?: string;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  t?: (key: string, options?: Record<string, unknown>) => string;
};

export function makeMockRequest(overrides: MockRequestOverrides = {}): Request {
  const headers: Record<string, string | string[] | undefined> = {
    "user-agent": overrides.userAgent ?? "jest-test-agent/1.0",
    ...overrides.headers
  };

  const req = {
    t: overrides.t ?? jest.fn((key: string) => key),
    language: overrides.language ?? "en",
    ip: overrides.ip ?? "127.0.0.1",
    headers,
    body: overrides.body ?? {},
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    socket: { remoteAddress: overrides.socketAddress ?? "127.0.0.1" },
    get(name: string): string | undefined {
      const value = headers[name.toLowerCase()];
      if (Array.isArray(value)) return value[0];
      return value;
    }
  };

  return req as unknown as Request;
}
