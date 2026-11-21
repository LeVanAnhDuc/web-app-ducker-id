# Express 5 — drop `asyncHandler` and the hand-written error forwarding

Date: 2026-11-21 · Branch: `refactor/express-5`

## Why

Express 4 ignores a rejected promise from an `async` handler. The request hangs and the rejection
reaches `process.on("unhandledRejection")`, which in `server.ts` starts a graceful shutdown — so one
async handler or middleware that forgot its wrapper takes the whole API down. The codebase defended
against that by hand in four places: `asyncHandler` (health + OAuth routes), `handle()` (63 routes),
`validationPipe` and `authGuard`, each a `try { … } catch (e) { next(e) }`. Nothing stopped the next
one from being forgotten.

Express 5 (stable since 2024-09) forwards a thrown error or a rejected promise from any handler or
middleware to the error handlers itself. Upgrading removes the wrapper and the whole class of bug.

Libraries considered and rejected: `express-async-handler` (the same ten lines we had),
`express-async-errors` (monkey-patches Express 4's router, last release 2019).

## What changes

| Place | Before | After |
| --- | --- | --- |
| `utils/async-handler.ts` | `asyncHandler` + `asyncDatabaseHandler` | `asyncHandler` deleted; `asyncDatabaseHandler` (Mongo error mapping, unrelated to Express) stays |
| `loaders/health.ts`, `oauth.routes.ts` | `asyncHandler(fn)` | `fn` passed directly |
| `common/responses` `handle()` | `try/catch → next(err)` | lets the promise reject |
| `guards/auth.guard.ts` | `try/catch → next(err)` | throws |
| `pipes/validation.pipe.ts` | assigns `req[source] = value`; async with `try/catch` | see below; sync, throws |

## Express 5 behaviour changes that bit this repo

1. **`req.query` is a getter.** Assigning it throws `TypeError` in strict mode, which turned every
   route with a `queryPipe` (every list page) into a 500. The pipe now shadows the property with
   `Object.defineProperty(req, source, { value, writable, enumerable, configurable })`.
2. **`req.body` is `undefined` when nothing was posted** (Express 4 gave `{}`). A `Joi.object()`
   schema accepts `undefined`, so a required field went unreported and the controller crashed on
   `req.body.x`. The pipe validates `req[source] ?? {}`. The one route that reads `req.body` without
   a `bodyPipe` — `POST /oauth/token` — defaults it in the controller so an empty post still gets an
   RFC 6749 error rather than a `TypeError`.
3. **The default query parser is `simple`, not `extended`.** `?status[$ne]=success` stays a flat key
   `status[$ne]`, which `stripUnknown` drops — the request answers 200 with the filter silently
   ignored, where REQ-ADMINLOGINHISTORY / REQ-LOGINHISTORY require a query operator to be refused
   with 400. The client never sends bracket syntax (arrays go as `userIds=a,b`), so app traffic was
   unaffected, but the security contract was. `app.ts` sets `query parser` back to `extended`.
   Keeping `simple` and making unknown query keys a 400 is a possible later change; it alters the
   contract of every list endpoint, so it does not belong in this upgrade.

Checked and not affected: path-to-regexp v8 syntax (no route uses `*`, `?` or groups), removed APIs
(`req.param()`, `res.redirect('back')`, `app.del`), `@bull-board/express` 6.21 (already depends on
Express 5).

## Tests

- `pipes/validation.pipe.spec.ts` (new) — runs the pipes in a real Express app: query replaced with
  the converted, stripped value; invalid query → 400; no body → 400; valid body passes. The first and
  third failed on Express 5 before the pipe fix.
- `oauth.controller.spec.ts` — `token` hands the service `{}` when the body is missing.
- `responses/index.spec.ts`, `guards/auth.guard.spec.ts` — the contract is now "throws / rejects",
  not "calls `next(err)`"; `handle` also has a real-Express test that a thrown `NotFoundError`
  reaches the error handler as a 404.
- `app.spec.ts` (new) — the real `app` parses `status[$ne]=x` into `{ status: { $ne: "x" } }`.
- Regression, Playwright API layer on the e2e stack (DB `ducker-id-e2e`, API :5600, client :3600):
  first full run 498 passed / 11 failed / 23 did not run. Two failures were item 3 above; the rest
  lined up with `ECONNRESET` / `Connection timeout` from the cloud Redis in the server log at the
  same minutes. After the fix, every affected file (admin-login-history, login-history, oidc,
  password/change-password, support/contact) was rerun: 178 passed, 0 failed. The UI layer was not
  run — the change is server-only, and the test plan scopes backend-only changes to `test:api`.
