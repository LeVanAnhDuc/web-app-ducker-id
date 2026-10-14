import type { APIResponse } from "@playwright/test";
import { API_PREFIX } from "@/config/urls";
import { escapeRegExp } from "@/utils/regex";
import type { BaseClient } from "./base.client";

// Support requests — server/src/modules/contact-admin. One resource, three
// routers (contact-admin.routes.ts):
//
//   POST /contact/submit   public (rl.contactByIp → optionalAuthGuard): a valid
//                          Bearer attaches the request to the caller (userId),
//                          none files it as a guest, a broken one is refused
//   GET  /contacts(/:id)   authGuard: the caller's own requests only — another
//                          user's or a guest's request answers 404, never 403
//   /admin/contacts*       authGuard + adminGuard: the admin inbox (module
//                          ADMINCONTACT): adminList / adminGet / adminUpdateStatus
//
// Submit body (validators/schemas/contact-admin.ts → submitContactSchema):
// subject 5…200, message 20…5000 (both re-checked after markup and whitespace
// are stripped), email optional ("" allowed). Unknown keys are stripped.
// Query of /contacts (myContactsQuerySchema): page ≥ 1, limit 1…100, status ∈
// new / processing / resolved, search ≤ 200 (subject or email), sortBy ∈
// createdAt / priority / status, sortOrder. Values are sent as given, so a
// test can pass an invalid one.

/**
 * The browser's calls to these endpoints, for `page.route` /
 * `waitForResponse` in UI specs (the prefix is the client's, never hardcoded).
 */
export const contactRoutes = {
  /** POST /contact/submit. */
  submit: new RegExp(`${escapeRegExp(API_PREFIX)}/contact/submit(\\?|$)`),
  submitPath: `${API_PREFIX}/contact/submit`,
  /** GET /contacts with or without a query string — never /contacts/:id. */
  myList: new RegExp(`${escapeRegExp(API_PREFIX)}/contacts(\\?|$)`),
  myListPath: `${API_PREFIX}/contacts`,
  /** GET /admin/contacts with or without a query string — never /admin/contacts/:id. */
  adminList: new RegExp(`${escapeRegExp(API_PREFIX)}/admin/contacts(\\?|$)`),
  adminListPath: `${API_PREFIX}/admin/contacts`,
  /** GET /admin/contacts/:id — never …/:id/status. */
  adminDetail: new RegExp(
    `${escapeRegExp(API_PREFIX)}/admin/contacts/[^/?]+(\\?|$)`
  ),
  /** PATCH /admin/contacts/:id/status. */
  adminStatus: new RegExp(
    `${escapeRegExp(API_PREFIX)}/admin/contacts/[^/?]+/status(\\?|$)`
  )
} as const;

export type ContactStatus = "new" | "processing" | "resolved";
export type ContactPriority = "low" | "medium" | "high";

/** POST /contact/submit → data (server SubmitContactResponseDto). */
export interface SubmittedContact {
  id: string;
  email: string | null;
  subject: string;
  message: string;
  priority: ContactPriority;
  status: ContactStatus;
  createdAt: string;
}

/** One row of GET /contacts (server ContactListItemDto). */
export interface MyContactItem {
  _id: string;
  email: string | null;
  subject: string;
  priority: ContactPriority;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

/** GET /contacts/:id → data (server ContactDetailItemDto). */
export interface MyContactDetail extends MyContactItem {
  message: string;
}

export interface MyContactsPage {
  items: MyContactItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** One row of GET /admin/contacts (server ContactListItemDto) — no `message`. */
export type AdminContactItem = MyContactItem;

/**
 * GET /admin/contacts/:id → data (server ContactDetailItemDto). `userId` and
 * `ipAddress` are what the admin card renders when present; the DTO sends
 * neither today (defects/admin-contact.md#bug-admincontact-01).
 */
export interface AdminContactDetail extends MyContactDetail {
  userId?: string | null;
  ipAddress?: string | null;
}

export interface AdminContactsPage {
  items: AdminContactItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/**
 * The request a POST /contact/submit filed. Throws (like `sessionOf`) when
 * the submit failed — for specs where filing is a precondition, not the check.
 */
export async function submittedOf(res: APIResponse): Promise<SubmittedContact> {
  if (!res.ok()) {
    throw new Error(
      `POST /contact/submit → ${res.status()} ${await res.text()}`
    );
  }
  const data = ((await res.json()) as { data?: SubmittedContact }).data;
  if (!data?.id) throw new Error("POST /contact/submit returned no id");
  return data;
}

export function createContactClient(base: BaseClient) {
  return {
    /**
     * POST /contact/submit. `body` is sent as given (a test may leave a field
     * out or add one the schema strips); `headers` e.g. a broken Bearer.
     */
    submit(
      body: Record<string, unknown>,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("post", "/contact/submit", { data: body, headers });
    },

    /** GET /contacts — the caller's own requests. */
    listMine(
      params?: Record<string, string | number | boolean>
    ): Promise<APIResponse> {
      return base.call("get", "/contacts", { params });
    },

    /** GET /contacts/:id — one of the caller's own requests. */
    getMine(id: string): Promise<APIResponse> {
      return base.call("get", `/contacts/${id}`);
    },

    // ── /admin/contacts* (module ADMINCONTACT): authGuard + adminGuard ──
    // List query (adminListContactsQuerySchema): page ≥ 1, limit 1…100,
    // status, priority, email (partial, trimmed), search ≤ 200 (subject or
    // email, trimmed), fromDate / toDate (ISO, from ≤ to), sortBy, sortOrder.
    // Values are sent as given, so a test can pass an invalid one.

    /** GET /admin/contacts — the whole inbox. */
    adminList(
      params?: Record<string, string | number | boolean>
    ): Promise<APIResponse> {
      return base.call("get", "/admin/contacts", { params });
    },

    /** GET /admin/contacts/:id — any request, whoever filed it. */
    adminGet(id: string): Promise<APIResponse> {
      return base.call("get", `/admin/contacts/${id}`);
    },

    /**
     * PATCH /admin/contacts/:id/status. `body` is sent as given:
     * `{ status: "processing" }`, or a malformed one to prove validation.
     */
    adminUpdateStatus(
      id: string,
      body: Record<string, unknown>
    ): Promise<APIResponse> {
      return base.call("patch", `/admin/contacts/${id}/status`, {
        data: body
      });
    }
  };
}

export type ContactClient = ReturnType<typeof createContactClient>;
