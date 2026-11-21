// libs
import { AsyncLocalStorage } from "async_hooks";
// types
import type { Request, RequestHandler } from "express";
// common
import { UnauthorizedError } from "@/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { DEFAULT_LOCALE } from "@/i18n/locales.config";

/**
 * Who is calling, as the transport saw it. Services read it from here rather
 * than taking Express's `Request`, so the HTTP layer stays in controllers.
 */
export interface ClientInfo {
  /** As Express resolved it (`trust proxy` applies); "" when unknown. */
  ip: string;
  userAgent: string;
  /** Raw `x-client-type` header; login history maps it to a `ClientType`. */
  clientType?: string;
  /** Locale i18next detected for this request. */
  language: string;
}

export const CLIENT_HEADERS = {
  USER_AGENT: "user-agent",
  CLIENT_TYPE: "x-client-type"
} as const;

/** What a call outside any request (a job, a script, a test) sees. */
const NO_CLIENT: ClientInfo = {
  ip: "",
  userAgent: "",
  language: DEFAULT_LOCALE
};

interface RequestStore {
  user?: RequestUserPayload;
  requestId?: string;
  client?: ClientInfo;
}

const storage = new AsyncLocalStorage<RequestStore>();

const header = (req: Request, name: string): string | undefined => {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
};

const readClient = (req: Request): ClientInfo => ({
  ip: req.ip || req.socket?.remoteAddress || "",
  userAgent: header(req, CLIENT_HEADERS.USER_AGENT) ?? "",
  clientType: header(req, CLIENT_HEADERS.CLIENT_TYPE),
  language: req.language || DEFAULT_LOCALE
});

export const RequestContext = {
  /** Mounted after i18next in `app.ts`, so `req.language` is already set. */
  middleware: (): RequestHandler => (req, _res, next) => {
    storage.run({ client: readClient(req) }, () => {
      const store = storage.getStore();
      if (store && req.requestId) store.requestId = req.requestId;
      next();
    });
  },

  getClient: (): ClientInfo => storage.getStore()?.client ?? NO_CLIENT,

  setRequestId: (requestId: string): void => {
    const store = storage.getStore();
    if (store) store.requestId = requestId;
  },

  getRequestId: (): string | undefined => storage.getStore()?.requestId,

  setUser: (user: RequestUserPayload): void => {
    const store = storage.getStore();
    if (store) store.user = user;
  },

  getUser: (): RequestUserPayload | undefined => storage.getStore()?.user,

  getUserId: (): string | undefined => storage.getStore()?.user?.sub,

  requireUser: (): RequestUserPayload => {
    const user = storage.getStore()?.user;
    if (!user) {
      throw new UnauthorizedError({
        key: "common:errors.unauthorized",
        code: ERROR_CODES.AUTH_MISSING_TOKEN
      });
    }
    return user;
  },

  requireUserId: (): string => {
    const user = storage.getStore()?.user;
    if (!user) {
      throw new UnauthorizedError({
        key: "common:errors.unauthorized",
        code: ERROR_CODES.AUTH_MISSING_TOKEN
      });
    }
    return user.sub;
  },

  requireAuthId: (): string => {
    const user = storage.getStore()?.user;
    if (!user) {
      throw new UnauthorizedError({
        key: "common:errors.unauthorized",
        code: ERROR_CODES.AUTH_MISSING_TOKEN
      });
    }
    return user.authId;
  }
};
