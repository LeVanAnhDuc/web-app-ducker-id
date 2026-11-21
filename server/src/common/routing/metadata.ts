// libs
import { StatusCodes } from "http-status-codes";
// types
import type { RateLimitName } from "@/middlewares/common/rate-limiter.middleware";
import type { ValidationSource } from "@/middlewares/pipes/validation.pipe";
import type { DtoClass } from "@/validators/validate-dto";

export type GuardName =
  | "auth"
  | "admin"
  | "optionalAuth"
  | "passwordChangeAuth";

export interface RespondOptions {
  status?: number;
  message?: I18n.Key;
}

/** Everything `orderMiddlewares` needs to build one action's chain. */
export interface RouteMeta {
  /** `Class.method`, for error messages. */
  id: string;
  classGuards: GuardName[];
  methodGuards: GuardName[];
  rateLimits: RateLimitName[];
  pipes: Partial<Record<ValidationSource, DtoClass<object>>>;
  respond: { status: number; message?: I18n.Key };
}

interface MethodMeta {
  guards: GuardName[];
  rateLimits: RateLimitName[];
  pipes: Partial<Record<ValidationSource, DtoClass<object>>>;
  respond?: RespondOptions;
}

interface ClassMeta {
  guards: GuardName[];
  methods: Map<string, MethodMeta>;
}

// Keyed by the controller class. routing-controllers keeps its own global
// storage for verbs and paths; this holds only what our decorators record.
const store = new WeakMap<object, ClassMeta>();

const classMeta = (Ctor: object): ClassMeta => {
  let meta = store.get(Ctor);
  if (!meta) {
    meta = { guards: [], methods: new Map() };
    store.set(Ctor, meta);
  }
  return meta;
};

const methodMeta = (Ctor: object, method: string): MethodMeta => {
  const { methods } = classMeta(Ctor);
  let meta = methods.get(method);
  if (!meta) {
    meta = { guards: [], rateLimits: [], pipes: {} };
    methods.set(method, meta);
  }
  return meta;
};

/**
 * Decorators apply bottom-up; prepending keeps what is recorded in the order
 * the decorators are read, top to bottom.
 */
export const recordClassGuard = (Ctor: object, guard: GuardName): void => {
  classMeta(Ctor).guards.unshift(guard);
};

export const recordMethodGuard = (
  Ctor: object,
  method: string,
  guard: GuardName
): void => {
  methodMeta(Ctor, method).guards.unshift(guard);
};

export const recordRateLimits = (
  Ctor: object,
  method: string,
  names: RateLimitName[]
): void => {
  methodMeta(Ctor, method).rateLimits.unshift(...names);
};

export const recordPipe = (
  Ctor: object,
  method: string,
  source: ValidationSource,
  Dto: DtoClass<object>
): void => {
  const { pipes } = methodMeta(Ctor, method);
  if (pipes[source]) {
    throw new Error(
      `${nameOf(Ctor)}.${method} validates its ${source} twice (${pipes[source].name}, ${Dto.name})`
    );
  }
  pipes[source] = Dto;
};

export const recordRespond = (
  Ctor: object,
  method: string,
  options: RespondOptions
): void => {
  methodMeta(Ctor, method).respond = options;
};

const nameOf = (Ctor: object): string =>
  (Ctor as { name?: string }).name ?? "<anonymous>";

export const readRouteMeta = (Ctor: object, method: string): RouteMeta => {
  const cls = store.get(Ctor);
  const meta = cls?.methods.get(method);

  return {
    id: `${nameOf(Ctor)}.${method}`,
    classGuards: [...(cls?.guards ?? [])],
    methodGuards: [...(meta?.guards ?? [])],
    rateLimits: [...(meta?.rateLimits ?? [])],
    pipes: { ...meta?.pipes },
    respond: {
      status: meta?.respond?.status ?? StatusCodes.OK,
      message: meta?.respond?.message
    }
  };
};
