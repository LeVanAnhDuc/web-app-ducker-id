// libs
import { AsyncLocalStorage } from "async_hooks";
// types
import type { RequestHandler } from "express";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";

interface RequestStore {
  user?: RequestUserPayload;
  requestId?: string;
}

// AsyncLocalStorage share data across the same Async Context
const storage = new AsyncLocalStorage<RequestStore>();

export const RequestContext = {
  middleware: (): RequestHandler => (req, _res, next) => {
    storage.run({}, () => {
      const store = storage.getStore();
      if (store && req.requestId) store.requestId = req.requestId;
      next();
    });
  },

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
        i18nMessage: (t) => t("common:errors.unauthorized"),
        code: ERROR_CODES.AUTH_MISSING_TOKEN
      });
    }
    return user;
  },

  requireUserId: (): string => {
    const user = storage.getStore()?.user;
    if (!user) {
      throw new UnauthorizedError({
        i18nMessage: (t) => t("common:errors.unauthorized"),
        code: ERROR_CODES.AUTH_MISSING_TOKEN
      });
    }
    return user.sub;
  },

  requireAuthId: (): string => {
    const user = storage.getStore()?.user;
    if (!user) {
      throw new UnauthorizedError({
        i18nMessage: (t) => t("common:errors.unauthorized"),
        code: ERROR_CODES.AUTH_MISSING_TOKEN
      });
    }
    return user.authId;
  }
};
