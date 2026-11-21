// libs
import { StatusCodes } from "http-status-codes";
import {
  getMetadataArgsStorage,
  HttpCode,
  OnUndefined,
  UseBefore,
  useContainer,
  useExpressServer
} from "routing-controllers";
// types
import type { Express, RequestHandler } from "express";
import type { Action } from "routing-controllers";
import type {
  RateLimitName,
  RateLimiters
} from "@/middlewares/common/rate-limiter.middleware";
import type { RouteMeta } from "./metadata";
import type { RouteChainLabel } from "./order";
// common
import { RATE_LIMITS } from "@/middlewares/common/rate-limiter.middleware";
// others
import { EnvelopeInterceptor } from "./envelope.interceptor";
import { readRouteMeta } from "./metadata";
import { orderMiddlewares } from "./order";

export const ROUTE_PREFIX = "/api/v1";

interface PlannedAction {
  Ctor: object;
  method: string;
  verb: string;
  path: string;
  meta: RouteMeta;
  handlers: RequestHandler[];
  labels: RouteChainLabel[];
}

const joinPath = (...parts: string[]): string => {
  const path = parts.join("").replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/$/, "") : path;
};

/**
 * Every action of the given controllers, in registration order (controllers
 * as passed, actions in method declaration order), with its computed chain.
 * Throws before anything is registered when a chain is refused.
 */
const planActions = (
  controllers: object[],
  rl: RateLimiters
): PlannedAction[] => {
  const storage = getMetadataArgsStorage();

  return controllers.flatMap((instance) => {
    const Ctor = instance.constructor;
    const controller = storage.controllers.find((c) => c.target === Ctor);
    if (!controller) {
      throw new Error(`${Ctor.name} is not decorated with @JsonController`);
    }

    return storage.actions
      .filter((action) => action.target === Ctor)
      .map((action) => {
        const meta = readRouteMeta(Ctor, action.method);
        return {
          Ctor,
          method: action.method,
          verb: action.type.toUpperCase(),
          path: joinPath(
            ROUTE_PREFIX,
            String(controller.route ?? ""),
            String(action.route ?? "")
          ),
          meta,
          ...orderMiddlewares(meta, rl)
        };
      });
  });
};

/**
 * The routes the controllers declare, one row per action, as the route
 * manifest spec compares them. Reads metadata only: instances may be built
 * with `Object.create(Ctor.prototype)`, and nothing is mounted.
 */
export const describeRoutes = (
  controllers: object[],
  rl: RateLimiters
): Array<{
  method: string;
  path: string;
  chain: string;
  status: string;
  message: string;
  action: string;
}> =>
  planActions(controllers, rl).map(({ verb, path, labels, meta, method }) => ({
    method: verb,
    path,
    chain: labels.join(" > "),
    status: StatusCodes[meta.respond.status] ?? String(meta.respond.status),
    message: meta.respond.message ?? "—",
    action: method
  }));

/**
 * What one app was mounted with. routing-controllers keeps a single global
 * metadata store and a single global container, so the chain registered on a
 * class is shared by every app it is mounted on; the parts that differ per
 * app — the limiters and the controller instances — are looked up per
 * request through `req.app`.
 */
interface MountedApp {
  rl: RateLimiters;
  instances: Map<unknown, object>;
}

const mountedApps = new WeakMap<object, MountedApp>();

const mountedAppOf = (app: unknown): MountedApp => {
  const mounted = mountedApps.get(app as object);
  if (!mounted) {
    throw new Error("The request reached a controller of an unmounted app");
  }
  return mounted;
};

// Stands in for the real limiters inside the registered chains: each one
// forwards to the limiter of the app that received the request.
const perAppLimiters = Object.fromEntries(
  Object.keys(RATE_LIMITS).map((name) => {
    const handler: RequestHandler = (req, res, next) =>
      mountedAppOf(req.app).rl[name as RateLimitName](req, res, next);
    return [name, handler];
  })
) as unknown as RateLimiters;

// Classes whose chains are already in routing-controllers' store; registering
// them again would run every middleware twice.
const decorated = new WeakSet<object>();

const container = {
  get<T>(
    someClass: { new (...args: never[]): T } | (() => void),
    action?: Action
  ): T {
    const name = (someClass as { name?: string }).name;
    if (!action) throw new Error(`${name} was requested outside a request`);

    const instance = mountedAppOf(action.request.app).instances.get(someClass);
    if (!instance) throw new Error(`No instance registered for ${name}`);
    return instance as T;
  }
};

/**
 * Mounts the controllers under `/api/v1` with routing-controllers. Each
 * action's whole chain is registered in one `UseBefore(...)` — stacked
 * `UseBefore` decorators would run bottom-up — and the pre-built instances
 * are served through `useContainer`, so the hand-wired DI stays.
 *
 * Several apps may mount the same classes (each spec builds its own), each
 * with its own limiters and instances; mounting one app twice throws.
 */
export const mountControllers = (
  app: Express,
  controllers: object[],
  rl: RateLimiters
): void => {
  if (mountedApps.has(app)) {
    throw new Error("mountControllers was already called for this app");
  }

  // Refuses a refused chain before anything is registered, and checks that
  // every limiter name an action uses is a function in `rl`; the chains
  // registered use the per-app stand-ins.
  for (const { Ctor, method, meta } of planActions(controllers, rl)) {
    for (const name of meta.rateLimits) {
      if (
        typeof (rl as unknown as Record<string, unknown>)[name] !== "function"
      ) {
        throw new Error(
          `${(Ctor as { name: string }).name}.${method} uses rate limiter "${name}", which is missing from the limiters given to mountControllers`
        );
      }
    }
  }
  const planned = planActions(controllers, perAppLimiters);

  for (const { Ctor, method, meta, handlers } of planned) {
    if (decorated.has(Ctor)) continue;
    const prototype = (Ctor as { prototype: object }).prototype;

    UseBefore(...handlers)(prototype, method);
    HttpCode(meta.respond.status)(prototype, method);
    if (meta.respond.status === StatusCodes.NO_CONTENT) {
      OnUndefined(StatusCodes.NO_CONTENT)(prototype, method);
    }
  }
  for (const { Ctor } of planned) decorated.add(Ctor);

  mountedApps.set(app, {
    rl,
    instances: new Map<unknown, object>([
      ...controllers.map((instance): [unknown, object] => [
        instance.constructor,
        instance
      ]),
      [EnvelopeInterceptor, new EnvelopeInterceptor()]
    ])
  });
  useContainer(container);

  useExpressServer(app, {
    routePrefix: ROUTE_PREFIX,
    controllers: controllers.map((instance) => instance.constructor),
    defaultErrorHandler: false,
    validation: false,
    classTransformer: false,
    interceptors: [EnvelopeInterceptor]
  });

  // routing-controllers calls next() after sending a response. Stop there, or
  // the request falls through to the 404 handler, which would answer twice.
  const stopAfterAction: RequestHandler = (req, res, next) => {
    if (
      (req as { routingControllersStarted?: boolean })
        .routingControllersStarted &&
      res.headersSent
    ) {
      return;
    }
    next();
  };
  app.use(ROUTE_PREFIX, stopAfterAction);
};

// Modules may take from routing-controllers only the verbs, JsonController,
// Req and Res; everything else comes from `@/common/routing`. Any other name
// could inject an unvalidated value (Param, BodyParam, CurrentUser…), or
// bypass the computed chain or the envelope (UseBefore, UseInterceptor,
// Redirect…). Type-only imports emit no code and are not checked.
const ALLOWED_ROUTING_IMPORTS = new Set([
  "Get",
  "Post",
  "Put",
  "Patch",
  "Delete",
  "JsonController",
  "Req",
  "Res"
]);

const FROM_ROUTING =
  /\b(import|export)\s+([^;'"]*?)\s*from\s*["']routing-controllers["']/g;
const LOADS_ROUTING =
  /\b(require|import)\s*\(\s*["']routing-controllers["']\s*\)/g;

const disallowedInClause = (clause: string): string[] => {
  if (/^type\b/.test(clause)) return [];

  const braces = /\{([^}]*)\}/.exec(clause);
  const rest = clause
    .replace(/\{[^}]*\}/, "")
    .replace(/,/g, " ")
    .trim();
  const names: string[] = [];

  if (rest.includes("*")) names.push("*");
  else if (rest) names.push("default");

  for (const specifier of braces?.[1].split(",") ?? []) {
    const trimmed = specifier.trim();
    if (!trimmed || /^type\s/.test(trimmed)) continue;
    const [name] = trimmed.split(/\s+as\s+/);
    if (!ALLOWED_ROUTING_IMPORTS.has(name)) names.push(name);
  }
  return names;
};

/**
 * Every name a source file takes from routing-controllers that is not on the
 * allowlist, in source order: `default` and `*` for default and namespace
 * imports (or `export *`), `require(...)` / `import(...)` for loads by call.
 */
export const findDisallowedRoutingImports = (source: string): string[] =>
  [
    ...[...source.matchAll(FROM_ROUTING)].map((match): [number, string[]] => [
      match.index,
      disallowedInClause(match[2])
    ]),
    ...[...source.matchAll(LOADS_ROUTING)].map((match): [number, string[]] => [
      match.index,
      [`${match[1]}(...)`]
    ])
  ]
    .sort(([a], [b]) => a - b)
    .flatMap(([, names]) => names);
