# Annotated controllers — hand-written routers → routing-controllers

> **Status: approved 2026-11-21; step 0 (Express 5 spike) passed — see "Step 0 result".**

## Why

A route today is assembled by hand in `<module>.routes.ts`, in an order the author must get right:

```ts
categories.use(authGuard, adminGuard);
categories.post(
  "/",
  rl.categoryMutationByIpAndUser,
  bodyPipe(CreateCategoryBodyDto),
  handle(controller.create, { status: StatusCodes.CREATED, message: "category:success.create" })
);
```

What a route needs — guard, limit, input, status, message — is spread over two files and wired by
position. 17 controllers, 69 routes, 43 guard uses, 60 pipes. The class-validator migration (#43)
made the input a class; this change puts the rest of the route on the controller method too, the
way NestJS reads.

## Goals

- Every `/api/v1` route is declared on its controller method: verb + path, guards, rate limits,
  input DTOs, status and success message.
- `*.routes.ts` disappear for those modules; a module factory returns controller **instances**.
- The order a request goes through is fixed by the framework and two rules (below), not by
  whoever writes the route.
- No user-visible change: same paths, status codes, envelopes, messages, headers, error bodies.

## Non-goals

- The OAuth routes (`/oauth/*`, `/.well-known/*`). RFC 6749 fixes their bodies and they answer by
  hand; they stay on a plain Express router.
- `/health`, Bull Board, Swagger UI — mounted in `loaders/http.ts`, unchanged.
- Generating OpenAPI from decorators (`routing-controllers-openapi`). `swagger/` stays hand-written.
- Replacing the hand-wired DI with a container library (typedi, tsyringe).

## Anti-goals

- A request reaches validation before its rate limiter, or a user-keyed limiter before its guard.
- A validation error whose body differs from today's (`code`, i18n `message`, `errors[]` with
  `field` / `reason` / `message`, first failure per field, `isObject` for a non-object body).
- An error answered by routing-controllers' own handler instead of `error.filter.ts`.

## The order a request goes through

routing-controllers 0.11.3 registers each action as (`ExpressDriver.js`, `registerAction`):

```
@UseBefore on the class → @UseBefore on the method
→ body-parser (if @Body) → @Authorized check
→ handler: params resolved (@Body/@QueryParams/@Params → class-transformer + class-validator) → action
→ @UseAfter
```

Two rules follow, and the design builds them into decorators so they cannot be broken:

1. **Guards on the class, limits on the method.** Class-level `@UseBefore` runs before
   method-level, so `@Auth()` / `@Admin()` on the class always precede `@RateLimit(...)` — which
   matters for the five limiters keyed by the authenticated user (`byIpAndAuth`, `byUser`). A
   controller whose methods need different guards puts them on the method, **above**
   `@RateLimit`, and `@RateLimit` asserts at boot that a user-keyed limiter has a guard before it.
2. **Validation always last.** It happens inside the handler, after every middleware, which is
   today's order (`rl.*` before `bodyPipe`).

Two framework behaviours are avoided on purpose:

- **`@Authorized()`** runs *after* every `@UseBefore`, so a user-keyed limiter would run before
  the check and throw. Guards stay middleware, wrapped as `@Auth()`, `@Admin()`,
  `@OptionalAuth()`, `@PasswordChangeAuth()`.
- **Stacked `@UseBefore` run in reverse reading order** (decorators apply bottom-up and each
  pushes). Each custom decorator registers its middlewares in one `UseBefore(...list)` call.

## Design

### Controllers

```ts
@JsonController("/admin/categories")
@Auth()
@Admin()
export class CategoryAdminController {
  constructor(private readonly service: CategoryService) {}

  @Post("/")
  @RateLimit("categoryMutationByIpAndUser")
  @HttpCode(StatusCodes.CREATED)
  @Message("category:success.create")
  create(@Body() body: CreateCategoryBodyDto) {
    return this.service.create(body);
  }

  @Patch("/:id")
  @RateLimit("categoryMutationByIpAndUser")
  @Message("category:success.update")
  update(@Params() params: CategoryIdParamsDto, @Body() body: UpdateCategoryBodyDto) {
    return this.service.update(params.id, body);
  }
}
```

Controller fields that are arrow functions today (`login = async (req, res) => …`) become methods;
decorators cannot wrap a field.

### Rate limits

`@RateLimit(...names: RateLimitName[])` resolves names against the `RateLimiters` record that
`createRateLimiters(redis)` already builds (the `RATE_LIMITS` table from the rate-limit refactor).
Names are type-checked; a missing one fails to compile.

### Input

`@Body()`, `@QueryParams()`, `@Params()` take the DTO classes from #43. routing-controllers'
built-in validation is **off** (`validation: false`, `classTransformer: false`); a param decorator
of our own (`@Body()` re-exported from `@/common/routing`) runs the existing pipe logic, so
`whitelist`, `stopAtFirstError`, the `isObject` check, the Express 5 `req.query` shadowing and the
error shape stay exactly as #43 verified them. *Open question:* whether that is a custom param
decorator (`createParamDecorator`) or `@UseBefore(bodyPipe(Dto))` emitted by our `@Body` — the
latter keeps the pipe untouched but makes validation a middleware again, so rule 2 would need the
same boot-time ordering assertion as rule 1.

### Responses and errors

- A global interceptor wraps a returned value in `ResponsePattern` and translates `@Message`,
  replacing `handle()`. `@HttpCode` replaces `status`; `@OnUndefined(StatusCodes.NO_CONTENT)` keeps
  204 with no body.
- Response bodies are already shaped by the services through `toDto(XDto, doc)` (the
  `dto-mapping` work in progress), so routing-controllers' own `classTransformer` stays off: the
  interceptor only wraps, it never re-serialises.
- The 6 controllers that touch `res` (cookies, redirects) take `@Res()` and keep doing so.
- `defaultErrorHandler: false`; `error.filter.ts` stays the last middleware in `mountHttp`.
  routing-controllers' own `HttpError`s (unknown route under a controller, bad param type) are
  mapped there to the existing codes.

### Dependency injection

`useContainer({ get: (cls) => instances.get(cls) })`. Module factories keep building repository →
service → controller by hand and return the controller instance; `createModules()` collects them
into the map and passes the classes to `useExpressServer(app, { routePrefix: "/api/v1",
controllers })`. No container library, no change to factory order.

## Approaches

| | Approach | Trade-off | |
| --- | --- | --- | --- |
| 1 | **routing-controllers**, guards and limits as `@UseBefore` wrappers, our own pipe | annotations on the method; keeps our error shape and DI; one framework dependency, last released 08/2025 | **proposed** |
| 2 | Our own `endpoint()` reading metadata (the earlier preview) | no dependency, full control of order; we maintain the routing layer ourselves | fallback if step 0 fails |
| 3 | Move to NestJS | the real thing — guards, pipes, interceptors, DI; rewrites bootstrap, every module factory and the test harness | rejected: a rewrite, not a refactor |

## Step 0 result — passed (2026-11-21)

`server/src/common/routing/spike.spec.ts` (throwaway) runs routing-controllers 0.11.3 on the
repo's Express 5.2.1, with a real HTTP server and `fetch`:

| Check | Result |
| --- | --- |
| GET with `@QueryParam`, POST with `@Param`, DELETE | served under `routePrefix: "/api/v1"` |
| `useContainer` returning a pre-built controller instance | works — the hand-wired DI can stay |
| class `@UseBefore` → method `@UseBefore(a, b)` → action | `guard, a, b, action` — rule 1 holds |
| class guard refusing | stops before any method middleware |
| two stacked `@UseBefore` | run **bottom-up** (`second, first`) — confirms the trap; one `UseBefore(...list)` per decorator |
| `@HttpCode(201)`, `@OnUndefined(204)` | 201 with body, 204 with an empty body |
| async action rejecting, `defaultErrorHandler: false` | reaches our own error middleware with its status |

Found on install: routing-controllers declares `class-validator ^0.14.1` as a peer and the repo
runs 0.15.1 (since #43). With `validation: false` and `classTransformer: false` it is never
called, so the warning is harmless — but it rules out turning the framework's validation on.

Not covered yet, and first in the plan: the envelope interceptor with `@Message`, `@Res()` for the
cookie/redirect controllers, a request under `/api/v1` that matches no controller (must stay the
current 404 envelope), and the #43 pipe running as a param decorator.

## Migration order — one branch, one PR, several commits

0. **Spike: Express 5.** routing-controllers 0.11.3 is tested against Express 4 (`express ^4.21.2`
   in its devDependencies); this repo runs Express 5 since #41. Wire `favorite` (smallest module:
   3 routes, a guard, params and query DTOs, no rate limit) and run its API suite. Fails → approach 2.
1. Routing core: `@/common/routing` (`@Auth`, `@Admin`, `@OptionalAuth`, `@PasswordChangeAuth`,
   `@RateLimit`, `@Message`, param decorators), the response interceptor, the container, boot-time
   ordering assertions, and their specs.
2. Modules in groups, the API suite green after each: read-only (`favorite`, `recent-app`,
   `notification`, `login-history`) → admin (`category`, `entitlement`, `web-app`, `user`,
   `contact-admin`) → auth flows (`signup`, `login`, `forgot-password`, `change-password`,
   `unlock-account`, `logout`, `token`).
3. Delete `handle()` and the emptied `*.routes.ts`; update `CLAUDE.md` and
   `server/.claude/rules/` (local only).

## Verification

- `pnpm type-check`, `pnpm lint`, `pnpm test` (unit, including the routing core specs).
- `automation-test` API layer in full against the dedicated e2e stack — the real proof that paths,
  statuses, envelopes and messages did not move. `pnpm coverage:check` green.
- A spec per guarded + user-keyed-limited route asserting the registered middleware order.

## Left to the builder

- Exact decorator file split inside `src/common/routing/`.
- Whether the param decorators wrap the pipe or the pipe becomes a function both call (see Input).
