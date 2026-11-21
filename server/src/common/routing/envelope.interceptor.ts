// libs
import { StatusCodes } from "http-status-codes";
import { Interceptor } from "routing-controllers";
// types
import type { Request, Response } from "express";
import type { Action, InterceptorInterface } from "routing-controllers";
import type { RouteMeta } from "./metadata";

type Respond = RouteMeta["respond"];

/**
 * Wraps what an action returns in `ResponsePattern`, as `handle()` did: the
 * status comes from `@HttpCode` and the message key from `res.locals.respond`,
 * which the first handler of the route's chain sets. A 204 route and a
 * response the action wrote itself (it returned `res`, or it already sent
 * headers whatever it returned) pass through untouched, so nothing is sent
 * twice.
 */
@Interceptor()
export class EnvelopeInterceptor implements InterceptorInterface {
  intercept(action: Action, content: unknown): unknown {
    const req = action.request as Request;
    const res = action.response as Response;
    const respond: Respond | undefined = res.locals.respond;

    // The driver skips sending only when handed `res` itself, so an action
    // that already sent headers is answered with `res`, whatever it returned.
    if (content === res || res.headersSent) return res;
    if (respond?.status === StatusCodes.NO_CONTENT) return content;

    const message = respond?.message;
    const body: ResponsePattern<unknown> = {
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      message: message ? req.t(message) : "",
      data: content
    };
    return body;
  }
}
