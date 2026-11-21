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

/** Status (200 unless stated) and success message key, as the old `handle()` took. */
export const Respond =
  (options: RespondOptions = {}): MethodOnlyDecorator =>
  (target, method) => {
    recordRespond(target.constructor, String(method), options);
  };

type ParamDecorator = (
  target: object,
  method: string | symbol,
  index: number
) => void;

// The pipe stage has already validated req[source] and replaced it with the
// DTO instance by the time parameters are resolved; these only hand it over.
const handOver = (
  target: object,
  method: string | symbol,
  index: number,
  read: (request: Request) => unknown
): void => {
  createParamDecorator({
    value: ({ request }: { request: Request }) => read(request)
  })(target, String(method), index);
};

/** The whole of `req[source]`, validated against `Dto`. */
const whole =
  (source: ValidationSource) =>
  (Dto: DtoClass<object>): ParamDecorator =>
  (target, method, index) => {
    recordPipe(target.constructor, String(method), source, Dto);
    handOver(target, method, index, (request) => request[source]);
  };

/**
 * Single named values are validated by a class built here from their rules,
 * one per action and source, so the same pipe runs and a failure reads
 * exactly like a DTO's: `{ field: name, reason, message }`. Every named
 * value of one action and source lands on that one class.
 */
const synthesized = new WeakMap<object, Map<string, DtoClass<object>>>();

const classFor = (
  Ctor: object,
  method: string,
  source: ValidationSource
): DtoClass<object> => {
  let byAction = synthesized.get(Ctor);
  if (!byAction) synthesized.set(Ctor, (byAction = new Map()));

  const key = `${method}:${source}`;
  let Dto = byAction.get(key);
  if (!Dto) {
    Dto = class {};
    // `Dto = class {}` would otherwise be named "Dto".
    Object.defineProperty(Dto, "name", { value: "" });
    byAction.set(key, Dto);
    recordPipe(Ctor, method, source, Dto);
  }
  return Dto;
};

const named =
  (source: ValidationSource) =>
  (name: string, ...rules: PropertyDecorator[]): ParamDecorator =>
  (target, method, index) => {
    if (rules.length === 0) {
      // Without a rule class-validator's whitelist would strip the value.
      throw new Error(
        `${nameOf(target)}.${String(method)}: ${source} "${name}" needs at least one rule`
      );
    }
    const Dto = classFor(target.constructor, String(method), source);
    for (const rule of rules) rule(Dto.prototype, name);

    // Name the class after its values, so the route manifest reads
    // `params:id` rather than an anonymous class.
    const names = new Set((Dto.name ? Dto.name.split(",") : []).concat(name));
    Object.defineProperty(Dto, "name", { value: [...names].join(",") });

    handOver(
      target,
      method,
      index,
      (request) => (request[source] as Record<string, unknown>)[name]
    );
  };

const nameOf = (target: object): string =>
  (target.constructor as { name?: string }).name ?? "?";

/** A whole DTO, or one named value with its rules. */
interface SourceDecorator {
  (Dto: DtoClass<object>): ParamDecorator;
  (name: string, ...rules: PropertyDecorator[]): ParamDecorator;
}

const wholeOrNamed = (source: ValidationSource): SourceDecorator =>
  ((nameOrDto: string | DtoClass<object>, ...rules: PropertyDecorator[]) =>
    typeof nameOrDto === "string"
      ? named(source)(nameOrDto, ...rules)
      : whole(source)(nameOrDto)) as SourceDecorator;

/**
 * A path segment, like Spring's `@PathVariable`:
 * `@PathVariable("id", IsRequiredObjectId(key)) id: string`. Pass a DTO class
 * instead to take every segment as one validated object.
 */
export const PathVariable = wholeOrNamed("params");

/**
 * The query string, like Spring's `@RequestParam`: a DTO class for a filter or
 * list query with several fields, or `("email", IsAppEmail())` for one value.
 */
export const RequestParam = wholeOrNamed("query");

export const ValidBody = whole("body");
