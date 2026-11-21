// types
import type { RequestHandler } from "express";
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
import type { ValidationSource } from "@/middlewares/pipes/validation.pipe";
import type { GuardName, RouteMeta } from "./metadata";
// common
import { isUserKeyed } from "@/middlewares/common/rate-limiter.middleware";
import { adminGuard } from "@/middlewares/guards/admin.guard";
import {
  authGuard,
  passwordChangeAuthGuard
} from "@/middlewares/guards/auth.guard";
import { optionalAuthGuard } from "@/middlewares/guards/optional-auth.guard";
import {
  bodyPipe,
  paramsPipe,
  queryPipe
} from "@/middlewares/pipes/validation.pipe";

/** One step of a route's chain, as the manifest prints it: `rl:loginByIp`, `auth`, `body:LoginBodyDto`. */
export type RouteChainLabel = string;

const GUARDS: Record<GuardName, RequestHandler> = {
  optionalAuth: optionalAuthGuard,
  passwordChangeAuth: passwordChangeAuthGuard,
  auth: authGuard,
  admin: adminGuard
};

// Within one level (class or method) an authenticating guard runs before the
// admin check, whatever order the decorators were written in.
const GUARD_RANK: GuardName[] = [
  "optionalAuth",
  "passwordChangeAuth",
  "auth",
  "admin"
];

// Guards that leave an authenticated user in the request context; a
// user-keyed limiter needs one of them in front of it.
const AUTHENTICATING: ReadonlySet<GuardName> = new Set<GuardName>([
  "passwordChangeAuth",
  "auth",
  "admin"
]);

const PIPES: ReadonlyArray<
  [ValidationSource, (Dto: Parameters<typeof bodyPipe>[0]) => RequestHandler]
> = [
  ["params", paramsPipe],
  ["query", queryPipe],
  ["body", bodyPipe]
];

const byRank = (guards: GuardName[]): GuardName[] =>
  GUARD_RANK.filter((name) => guards.includes(name));

/**
 * The chain one action runs, in the fixed order
 * `IP/email-keyed limiters > guards (class, then method) > user-keyed limiters > params > query > body`.
 * The first handler records the route's status and message in
 * `res.locals.respond` for the envelope interceptor; it has no label.
 * Throws when a user-keyed limiter has no authenticating guard in front of it.
 */
export const orderMiddlewares = (
  route: RouteMeta,
  rl: RateLimiters
): { handlers: RequestHandler[]; labels: RouteChainLabel[] } => {
  const classGuards = byRank(route.classGuards);
  const methodGuards = byRank(
    route.methodGuards.filter((name) => !classGuards.includes(name))
  );
  const guards = [...classGuards, ...methodGuards];
  const ipLimits = route.rateLimits.filter((name) => !isUserKeyed(name));
  const userLimits = route.rateLimits.filter(isUserKeyed);

  if (
    userLimits.length > 0 &&
    !guards.some((name) => AUTHENTICATING.has(name))
  ) {
    throw new Error(
      `${route.id}: user-keyed limiter ${userLimits.join(", ")} needs an authenticating guard (@Auth, @Admin or @PasswordChangeAuth) in front of it`
    );
  }

  const steps: Array<[RouteChainLabel, RequestHandler]> = [
    ...ipLimits.map((name): [string, RequestHandler] => [
      `rl:${name}`,
      rl[name]
    ]),
    ...guards.map((name): [string, RequestHandler] => [name, GUARDS[name]]),
    ...userLimits.map((name): [string, RequestHandler] => [
      `rl:${name}`,
      rl[name]
    ]),
    ...PIPES.flatMap(([source, pipe]): Array<[string, RequestHandler]> => {
      const Dto = route.pipes[source];
      return Dto ? [[`${source}:${Dto.name}`, pipe(Dto)]] : [];
    })
  ];

  const { respond } = route;
  const recordRespond: RequestHandler = (_req, res, next) => {
    res.locals.respond = respond;
    next();
  };

  return {
    handlers: [recordRespond, ...steps.map(([, handler]) => handler)],
    labels: steps.map(([label]) => label)
  };
};
