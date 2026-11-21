# Env config on class-validator

Date: 2026-11-21 · Branch: `refactor/env-class-validator`

## Why

`constants/env.ts` read 27 variables through five hand-written parsers
(`utils/env/parse-env.ts`). Review found:

1. **First error only** — `parseRequired` threw at the first missing variable.
2. **Silent fallback** — `parseNumber` returned the default for anything not a number:
   `APP_PORT=50O0` started the server on 3000 without a word.
3. `parseBoolean` accepted only `"true"`; `TRUE` and `1` read as false.
4. No enum or URL checks — `NODE_ENV=prod`, `LOG_LEVEL=verbos`, `OIDC_ISSUER=localhost:3000` passed.
5. No JWT secret strength check (the dev `.env` secrets are 11–19 characters).
6. Production did not require the OIDC key pair — `libs/jwks` falls back to a key generated per
   process, so every token stops verifying on restart — nor SMTP credentials.
7. `CLIENT_URL` / `OIDC_ISSUER` defaulted to `http://localhost:3000` in production too.

## Library

zod 4 (has a CJS build) and envalid (8.x CJS, 9.x ESM-only) were compared. The decision was to
wait for the Joi → class-validator migration (#43) and use **class-validator + class-transformer**
for env as well, so the server keeps a single validation library.

## Design

- `utils/env/env.schema.ts` — class `EnvVariables`, one property per variable, defaults as property
  initialisers (`plainToInstance(..., { exposeDefaultValues: true })`). Reuses `ToInt`, `ToBoolean`,
  `Trim` from `@/validators/decorators`; `parseList` / `parseTrustProxy` stay as transforms.
- `utils/env/load-env.ts` — `loadEnv(source)`: drops blank values (blank has always meant unset),
  runs `validateSync(…, { stopAtFirstError: true })`, throws one `ConfigError` listing every bad
  variable, otherwise returns the same nested `ENV` shape as before plus `warnings`. Pure, so it is
  tested without touching `process.env`.
- `constants/env.ts` — `dotenv.config()` + `loadEnv(process.env)`; default export unchanged, so the
  18 importers and `migrate-mongo-config.js` are untouched. `ENV_WARNINGS` is logged by `server.ts`,
  because the logger reads this config and the env module cannot import it.
- Differences from request DTOs: `validateSync` (config is needed synchronously at import), plain
  English messages for the operator instead of i18n keys.

## Decisions on strictness

| Rule | Development / test | Production |
| --- | --- | --- |
| Bad number / boolean / enum / URL | refuse to boot | refuse to boot |
| JWT secret < 32 characters | warning | refuse |
| `CLIENT_URL`, `OIDC_ISSUER` | default `http://localhost:3000` | required |
| `OAUTH_PRIVATE_KEY` + `OAUTH_PUBLIC_KEY` | optional (ephemeral key); half a pair refused | required |
| `USERNAME_EMAIL`, `PASSWORD_EMAIL` | optional | required |

Secrets are production-only so the existing dev `.env` keeps working and no session is signed out.

**Trap found while building it:** `ValidateIf` skips *every* rule on a property, so
`@ValidateIf(isProduction) @MinLength(32)` on a secret also skipped "required" in development. The
production-only length rule is a `ValidateBy` validator instead.

## Tests

- `utils/env/load-env.spec.ts` (new, 28 cases): nested shape and defaults; numbers, deliberate `0`,
  origin list; booleans; `TRUST_PROXY` forms; dev warning on a short secret; every missing required
  variable named at once; ten bad-value cases that used to fall back silently; half a key pair; a
  complete production source; production refusing a short secret and each missing production-only
  variable. Watched fail before the module existed; the `ValidateIf` trap was caught by it.
- `parse-env.spec.ts` keeps `parseList` / `parseTrustProxy`; the removed parsers' tests went with them.
- Jest 124 suites / 937 tests. Runtime: the real dev `.env` and `.env.example` both load (three
  short-secret warnings); `migrate-mongo-config.js` reads the new config.
