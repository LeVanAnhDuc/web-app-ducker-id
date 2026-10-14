import type { APIResponse } from "@playwright/test";
import type { Session } from "./base.client";

// Readers for the server's envelopes:
//   success { timestamp, path, message, data }
//   error   { code, message, timestamp, path, errors? }

/** One entry of a VALIDATION_ERROR's `errors` (Joi detail, translated). */
export interface FieldError {
  field: string;
  reason: string;
  message: string;
}

export interface ErrorBody {
  code: string;
  message: string;
  timestamp?: string;
  path?: string;
  errors?: FieldError[];
}

export async function dataOf<T>(res: APIResponse): Promise<T> {
  return ((await res.json()) as { data: T }).data;
}

export async function errorOf(res: APIResponse): Promise<ErrorBody> {
  return (await res.json()) as ErrorBody;
}

/** The Session a successful login / verify response carries. Throws when it does not. */
export async function sessionOf(res: APIResponse): Promise<Session> {
  if (!res.ok()) {
    throw new Error(`${res.url()} → ${res.status()} ${await res.text()}`);
  }
  const accessToken = (await dataOf<{ accessToken?: string }>(res))
    ?.accessToken;
  if (!accessToken) throw new Error(`${res.url()} returned no accessToken`);
  return { accessToken };
}

/** Every `Set-Cookie` header of a response. */
export function setCookies(res: APIResponse): string[] {
  return res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);
}

/** The `Set-Cookie` header for one cookie name, or undefined. */
export function setCookie(res: APIResponse, name: string): string | undefined {
  return setCookies(res).find((c) => c.startsWith(`${name}=`));
}
