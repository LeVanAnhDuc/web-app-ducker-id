import type { APIResponse } from "@playwright/test";
import { expect } from "@/fixtures";
import type { ErrorBody } from "@/api/response";

// Shared by the ops specs only: the shape check every error envelope must pass
// (server/src/middlewares/filters/error.filter.ts).

/**
 * Reads an error response and checks the envelope itself: `code` and `message`
 * are strings, `path` is the request path, `timestamp` is a fresh ISO instant,
 * and there is no `data`.
 */
export async function errorBody(
  res: APIResponse,
  path: string
): Promise<ErrorBody> {
  const body = (await res.json()) as ErrorBody & Record<string, unknown>;
  expect(typeof body.code).toBe("string");
  expect(typeof body.message).toBe("string");
  expect(body.path).toBe(path);
  expect(body.timestamp).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  expect(Math.abs(Date.now() - Date.parse(body.timestamp!))).toBeLessThan(
    60_000
  );
  expect(body).not.toHaveProperty("data");
  return body;
}
