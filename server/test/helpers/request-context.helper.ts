// types
import type { MockRequestOverrides } from "./request.helper";
// others
import { RequestContext } from "@/utils/request-context";
import { makeMockRequest } from "./request.helper";

/**
 * Runs `fn` inside the RequestContext a real request would open, so code that
 * reads `RequestContext.getClient()` sees the given ip / user agent / language.
 * Async work started inside keeps the context.
 */
export const inRequest = <T>(
  overrides: MockRequestOverrides,
  fn: () => T
): T => {
  let result!: T;
  RequestContext.middleware()(makeMockRequest(overrides), {} as never, () => {
    result = fn();
  });
  return result;
};
