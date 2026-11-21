// common
import { recordApiErrors } from "@/common/routing/metadata";

/**
 * The shared `components.responses` entry each status points at
 * (`libs/swagger/common.schemas.ts`). A status needs an entry there before a
 * route can declare it.
 */
export const API_ERROR_RESPONSES: Readonly<Record<number, string>> = {
  400: "BadRequest",
  401: "Unauthorized",
  403: "Forbidden",
  404: "NotFound",
  409: "Conflict",
  429: "TooManyRequests"
};

/**
 * The route-specific errors the code cannot reveal: what a service throws
 * (404, 409, …). 400 from a pipe, 401/403 from a guard and 429 from a limiter
 * are derived from the route's decorators and must not be listed here.
 */
export const ApiErrors = (
  ...statuses: number[]
): ((target: object, method: string | symbol) => void) => {
  for (const status of statuses) {
    if (!API_ERROR_RESPONSES[status]) {
      throw new Error(
        `@ApiErrors(${status}): no shared response in components.responses`
      );
    }
  }
  return (target, method) => {
    recordApiErrors(target.constructor, String(method), statuses);
  };
};
