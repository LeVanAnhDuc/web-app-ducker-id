// libs
import { createParamDecorator } from "routing-controllers";
// types
import type { Request } from "express";
import type { RateLimitName } from "@/middlewares/common/rate-limiter.middleware";
import type { ValidationSource } from "@/middlewares/pipes/validation.pipe";
import type { DtoClass } from "@/validators/validate-dto";
import type { GuardName, RespondOptions } from "./metadata";
// others
import {
  recordClassGuard,
  recordMethodGuard,
  recordPipe,
  recordRateLimits,
  recordRespond
} from "./metadata";

/**
 * Every decorator here only records metadata. The middleware chain is built
 * from it by `orderMiddlewares` at mount, in a fixed order, so the order the
 * decorators are written in never changes what runs.
 */

type ClassOrMethodDecorator = (
  target: object,
  method?: string | symbol
) => void;
type MethodOnlyDecorator = (target: object, method: string | symbol) => void;

const guard =
  (name: GuardName): ClassOrMethodDecorator =>
  (target, method) => {
    if (method === undefined) recordClassGuard(target, name);
    else recordMethodGuard(target.constructor, String(method), name);
  };

/** `authGuard`: a valid access token, outside a temporary-password session. */
export const Auth = () => guard("auth");
/** `adminGuard`. Implies nothing: write `@Auth() @Admin()`. */
export const Admin = () => guard("admin");
/** `optionalAuthGuard`: authenticates only when a token is sent. */
export const OptionalAuth = () => guard("optionalAuth");
/** `passwordChangeAuthGuard`: change-password and logout only. */
export const PasswordChangeAuth = () => guard("passwordChangeAuth");

/** Method only. Names keep their order; user-keyed ones run after the guards. */
export const RateLimit =
  (...names: RateLimitName[]): MethodOnlyDecorator =>
  (target, method) => {
    recordRateLimits(target.constructor, String(method), names);
  };

/** Status (200 unless stated) and success message key, as `handle()` took. */
export const Respond =
  (options: RespondOptions = {}): MethodOnlyDecorator =>
  (target, method) => {
    recordRespond(target.constructor, String(method), options);
  };

// The pipe stage has already validated req[source] and replaced it with the
// DTO instance by the time parameters are resolved; this only hands it over.
const validated =
  (source: ValidationSource) =>
  (Dto: DtoClass<object>) =>
  (target: object, method: string | symbol, index: number): void => {
    recordPipe(target.constructor, String(method), source, Dto);
    createParamDecorator({
      value: ({ request }: { request: Request }) => request[source]
    })(target, String(method), index);
  };

export const ValidParams = validated("params");
export const ValidQuery = validated("query");
export const ValidBody = validated("body");
