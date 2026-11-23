# `@Transactional()` — one annotation instead of hand-run sessions

Date: 2026-11-23 · Branch: `refactor/transactional-decorator`

## Why

Three places run a MongoDB transaction, each by hand: `category/services/move.ts`,
`category/services/remove.ts` and `signup/services/complete-signup.ts`. Each repeats
`startSession()` → `withTransaction()` → `finally endSession()`, and — the real cost — threads a
`ClientSession` through every call inside: 11 repository methods take `session?: ClientSession`, and
signup carries it across modules through `AuthenticationService.create(…, session)` and
`UserService.createProfile(…, session)`. A call that forgets the argument silently runs outside the
transaction.

Mongoose 8.4+ (we run 8.19) can carry the session itself: with
`mongoose.set("transactionAsyncLocalStorage", true)`, every operation started inside
`connection.transaction(fn)` picks the session up from an `AsyncLocalStorage`. Checked in
`mongoose/lib`: `Query` exec (find, update, delete, count, distinct), `Aggregate`, `save` / `create`,
`insertMany`, `Model.bulkWrite` and `Connection.bulkWrite` all read it. Only raw driver calls through
`Model.collection.*` bypass it; the repositories have none (one `collection.collectionName` read).

## What changes

| Place | Before | After |
| --- | --- | --- |
| `common/stereotypes/transactional.decorator.ts` | — | `@Transactional()` method decorator |
| `database/mongodb/index.ts` | — | `mongoose.set("transactionAsyncLocalStorage", true)` before connecting |
| repository interfaces + Mongo impls | `session?: ClientSession` on 11 methods | parameter gone |
| `AuthenticationService.create` / `.updatePassword`, `UserService.createProfile` | optional `session` | parameter gone |
| `CategoryService.move` / `.remove` | `startSession` + `withTransaction` in the method file | `@Transactional()` on the façade method |
| `SignupService` | `createUserAccount` (module-private function) opens the transaction | `@Transactional() createUserAccount` method; `completeSignup` gets it through `deps` |
| `common/stereotypes/repository.decorator.ts` | every unknown Mongo error → `DatabaseError` | errors labelled `TransientTransactionError` / `UnknownTransactionCommitResult` pass through |

## Decisions

- **Propagation is "join".** A `@Transactional()` method called inside another transaction runs in
  that one instead of opening a second session (a second session would not see the first one's
  uncommitted writes and could deadlock on them).
- **Fail loudly when the switch is off.** The decorator throws `ConfigError` if
  `transactionAsyncLocalStorage` was not enabled: otherwise every query would quietly run outside the
  transaction it was meant to be in.
- **Keep the boundary tight.** `withTransaction` re-runs the whole callback on a transient error. In
  signup, the Redis cleanup after the writes must stay outside: if it ran inside and the commit were
  retried, the retry would `verify()` a signup session that the first attempt already cleared, and
  answer 400 to a user whose account was created. So only `createUserAccount` is transactional.
  `CategoryService.move` takes the whole method, including the read-back `list()` — a read is safe to
  repeat.
- **Let transient errors reach the retry loop.** `@Repository()` turned every unknown Mongo error into
  a `DatabaseError`, which drops the driver's error labels; `withTransaction` then never retried a
  `WriteConflict`, it returned 500. Labelled errors now pass through. When retries run out the raw
  error reaches `handleError`, which already answers an unknown error with a generic 500.
- **Duplicate key in signup.** The catch that maps a duplicate `email` to `SIGNUP_EMAIL_EXISTS` moves
  inside `createUserAccount`; the error still aborts the transaction, since it is rethrown.
- **The `if (!result)` abort check in signup goes.** `connection.transaction()` resolves with the
  callback's value; nothing in the callback aborts it by hand.

## Testing

- `transactional.decorator.spec.ts`: runs the method through `connection.transaction`, joins an
  outer transaction instead of nesting, refuses to run when the switch is off, and passes errors and
  results through.
- The `category` and `signup` specs stop mocking `mongoose.startSession` and assert that the façade
  method goes through the decorator; repository calls are asserted without a `session` argument.
- Unit tests cannot prove a real transaction. Before merging: `pnpm test` in `automation-test/` for
  `admin-categories` (move / delete with reassignment) and `auth` signup, against the e2e stack.
