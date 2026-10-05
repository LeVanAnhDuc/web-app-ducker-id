# Ducker ID — one account and one launcher for a constellation of web apps

Ducker ID (Identity Management System) is the sign-in gateway and app portal for the owner's family of web apps. Users register once, sign in with a password, an email OTP or a magic link, and land on a dashboard that lists the apps they can open, plus their own login history, notifications and support tickets. Administrators use the same site to register apps, manage accounts and work the support inbox.

This repository is a monorepo: `client/` is the Next.js web UI, `server/` is the Express REST API. It was assembled from the two former repositories `web-store-apps` (client) and `api-web-store-apps` (api).

## Features

- **One email-first entry point for sign-in and sign-up**
  - Type your email on the login screen; known addresses go to the password step, unknown ones are sent a sign-up code automatically and continue into registration
- **Sign up with email verification**
  - A one-time code is emailed to you, with a resend option, and must be verified before the account exists
  - Finish by filling in your name and password
- **Three ways to sign in**
  - Email + password
  - One-time code sent to your email
  - Magic link sent to your email — clicking it signs you in
  - The alternative-methods screen lets you switch between them mid-flow
- **Account lockout and self-service unlock**
  - Too many wrong passwords locks the account temporarily and the message says how long
  - Request an unlock code by email and verify it to get back in
- **Password recovery and change**
  - Forgot-password by one-time code or by magic link, then set a new password
  - Change your own password from the profile page
  - After an admin resets your password you are sent to a forced change-password screen and cannot use the rest of the site until you set a new one
- **App launcher dashboard**
  - Home page greets you by time of day, and "Jump back in" shows the apps you actually opened last
  - Home page charts your sign-in activity per day over 7, 30 or 90 days, cut in your own timezone, and breaks it down by sign-in method and device
  - Every figure on Home links through to the matching filtered list — a day on the chart, a method, a device, or just the failed sign-ins
  - A ranking of the apps you open most, counted over the whole history
  - `/apps` lists every app you may open — your role's apps plus any exception an admin made for you — with text search, category filter, grid/list toggle and pagination
  - Opening a tile launches that app's own URL in a new tab
  - Header search finds apps as you type, with keyboard navigation, and opens one directly or jumps to the full list
- **Favourites**
  - Star or unstar any app from its tile
  - `/favorites` shows just your starred apps
- **Recently used**
  - Every Open button records the launch, and so does signing in to a satellite app through Ducker ID; `/recently-used` lists each app once, newest first, grouped by Today / Yesterday / This Week / Earlier with the last-opened time and open count
  - Search, infinite scroll, star an app from its row, remove one app with Undo, or clear the whole history after a confirmation
- **Login history**
  - Your own sign-in attempts with method, success/failure and reason, IP, country and city, device type, OS and browser, and an anomaly flag
  - Each row shows where you signed in — Ducker ID itself or a satellite app over OIDC — and automatic SSO sign-ins from an existing session are recorded too, marked with an "Auto" badge; filter by app or by the SSO method
- **Notifications inbox**
  - Unread badge and panel in the header, plus a full `/notifications` page grouped by date
  - Mark a single notification or all of them as read
- **Support requests**
  - Submit a request from the support dialog anywhere in the app — as a signed-in user or as a guest
  - `/contacts/me` lists the requests you submitted with their ticket ID and status, and a read-only detail page
- **Your profile**
  - View and edit full name, phone, date of birth, gender and address
- **Language and appearance**
  - English and Vietnamese (Vietnamese pages under `/vi`), switched from the user menu
  - Light, dark or system theme
- **Admin — app registry**
  - `/admin/apps` lists registered apps with search, status and category filters and column controls
  - Create or edit an app: display name, description, icon URL, home URL, 1–5 ordered categories (with quick create), required roles, redirect URIs, post-logout redirect URIs, back-channel logout URI, grant and response types, scopes and token-endpoint auth method
  - A client ID and client secret are generated on creation; the secret is shown once, with a copy button
  - Activate or deactivate an app with a status switch
- **Admin — app access**
  - `/admin/entitlements` shows a user × app matrix for the users you pick: each user gets the apps their role allows by default
  - Edit any cell to grant an app beyond the role or revoke one despite it; exceptions carry a brass marker that says which way they go, and setting a cell back to the role default removes the exception
  - A revoked app disappears from the user's launcher, favourites and recently used, and signing in to it through Ducker ID is refused
- **Admin — categories**
  - `/admin/categories` creates, renames and reorders categories, each named in English and Vietnamese; the slug follows the English name
  - Deleting a category moves apps that only belonged to it to one shared category or to a category chosen per app
- **Admin — user accounts**
  - `/admin/users` lists accounts with search plus role and status filters
  - Lock and unlock an account
  - Reset a user's password: a temporary password is issued and the user must change it at next sign-in
- **Admin — login history and support inbox**
  - `/admin/login-history` shows sign-in attempts across all accounts, with a detail page per entry
  - `/admin/contact` lists incoming support requests with a detail view and a `new → processing → resolved` status workflow
  - `/admin` is a landing page linking to each admin area
- **Single sign-on for satellite apps (OpenID Connect)**
  - `/oauth/authorize`, `/oauth/token` and `/oauth/userinfo`, plus the discovery document at `/.well-known/openid-configuration` and public keys at `/.well-known/jwks.json`
  - Authorization Code with PKCE (S256), required for every client — authorization codes live 60 seconds and are single-use
  - A browser session cookie at the identity provider means an app you open while already signed in comes straight back, with no screen in between
  - `prompt=none` lets an app check for a session without ever showing a login screen
  - Apps register as confidential (issued a client secret) or public (no secret — for a browser-only app that cannot keep one)
  - ID and access tokens are signed RS256, so an app verifies them from the public JWKS without holding any secret
- **Operator tooling**
  - Swagger UI at `/api-docs` (and `/api-docs.json`) on the API
  - `/health` reports MongoDB and Redis status
  - Bull Board email-queue dashboard at `/admin/queues`

### Not built yet

These have a user interface but no working backend, or are named in `docs/project-goals.md` and not started. See `docs/unfinished-features.md`.

- **The rest of the OIDC surface** — `/oauth/introspect`, `/oauth/revoke` and refresh-token grants are not built, and there is no consent screen: an app a user is entitled to is authorized without being asked. `/oauth/logout` ends the identity-provider session but there is no back-channel logout, so an already-issued access token stays valid until it expires. The `oauth_consents` schema still has no routes.
- **Access-change notifications** — granting or revoking an app does not notify the user yet, and a user already inside a satellite app keeps it until their access token expires (15 minutes).
- **Admin force logout** — the dialog and success toast are wired to a mock; there is no endpoint. Signing out now destroys the server-side session, so satellite apps stop getting new tokens, but an admin still cannot end someone else's session.
- **Billing** — `/billing` shows payment methods, invoices and usage from hardcoded data; the Add and Download buttons do nothing and there is no billing module on the server.
- **Smaller gaps** — the three stat badges on the profile card are hardcoded, as is the weekly-activity chart on the home page; the profile Danger Zone "delete account" button has no handler; avatar upload has no endpoint.

## Tech Stack

| Layer     | Stack                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Client    | Next.js 15.3 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui + Radix · TanStack Query 5 · Zustand 5 · React Hook Form 7 + Zod 4 · next-intl 4 · Axios · Framer Motion |
| Server    | Node.js · Express 4 · TypeScript 5 · MongoDB with Mongoose 8 · Redis + BullMQ · JWT + bcrypt · Joi 17 · i18next · Nodemailer + React Email · Winston · Swagger UI |
| Testing   | Jest 30 + ts-jest on the server — **81 suites / 609 tests, all passing**. Playwright 1.60 on the client — 41 E2E spec files under `client/e2e/` (require a running client, server, MongoDB and Redis, so they are not counted here) |
| Tooling   | pnpm · ESLint · Prettier · Husky pre-commit running lint-staged in both `client/` and `server/`                 |

## Running

MongoDB and Redis must be running locally. There is no docker-compose or Makefile in this repo.

**1. Hooks (once, at the repo root)**

```bash
pnpm install          # installs husky only — the root package has no app dependencies
```

**2. Server** — from `server/`

```bash
cp .env.example .env  # then fill in the values
pnpm install
pnpm seed             # optional: seed apps, categories, users, contacts, notifications
pnpm dev              # API on http://localhost:5000, Swagger UI at /api-docs
```

Required environment variables are listed in `server/.env.example`: `APP_PORT`, `CLIENT_URL`, `CORS_ORIGINS`, `TRUST_PROXY`, `DB_URL` / `DB_NAME`, the `REDIS_*` group, `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `JWT_ID_SECRET`, and `USERNAME_EMAIL` / `PASSWORD_EMAIL` for outgoing mail. There is no migration framework — Mongoose creates collections and indexes on boot, and `pnpm seed` / `pnpm seed:clear` manage sample data.

**3. Client** — from `client/`

```bash
cp .env.example .env.local
pnpm install
pnpm dev              # http://localhost:3000
```

`client/.env.example` covers `NEXT_PUBLIC_API_PREFIX`, `API_SERVER_URL` (the backend origin that `next.config.ts` rewrites the API prefix to), `NEXT_PUBLIC_SITE_URL`, and the `E2E_*` variables used by Playwright.

**4. Tests**

```bash
cd server && pnpm test     # Jest unit tests — no database needed
cd client && pnpm e2e      # Playwright — needs client, server, MongoDB and Redis up and the DB seeded
```

## Project structure

```
.
├── client/                     # Next.js web UI
│   ├── src/
│   │   ├── app/[locale]/       # App Router: (public) auth pages, (private) dashboard/settings/admin
│   │   ├── views/              # One folder per page — the actual screens
│   │   ├── components/         # Shared UI, incl. shadcn primitives in components/ui
│   │   ├── layouts/            # Shells and guards: AppHeader, DashboardLayout, AdminLayout, AuthGuardLayout
│   │   ├── requests/           # Typed API callers, one file per feature
│   │   ├── hooks/ stores/      # React Query hooks; Zustand client state
│   │   ├── forms/ schemas/     # Form definitions and Zod validation
│   │   ├── locales/            # en/ and vi/ message catalogues
│   │   ├── mocks/              # Placeholder data for the not-yet-built features above
│   │   ├── ghosts/             # Headless side-effect components (e.g. TokenRefresher)
│   │   ├── dataSources/ constants/ contexts/ i18n/ libs/ types/ utils/
│   │   └── middleware.ts       # Locale routing
│   ├── e2e/                    # Playwright specs and setup projects
│   └── public/
├── server/                     # Express REST API, mounted under /api/v1
│   ├── src/
│   │   ├── app.ts server.ts    # Express wiring; boot with graceful shutdown
│   │   ├── loaders/            # Boot sequence: db, redis, services, queues, modules, health, errors
│   │   ├── modules/            # Feature modules (routes/controller/service/repository/swagger)
│   │   │                       #   auth: signup, login, logout, token, unlock-account,
│   │   │                       #   forgot-password, change-password, authentication
│   │   │                       #   product: user, web-app, favorite, login-history,
│   │   │                       #   notification, contact-admin, entitlement
│   │   │                       #   schema-only stub: oauth-consent
│   │   ├── models/             # Mongoose schemas
│   │   ├── middlewares/        # Guards, validation pipes, rate limiter, error handler
│   │   ├── validators/         # Joi schemas
│   │   ├── services/           # Email (Nodemailer + React Email) and BullMQ queue
│   │   ├── database/           # MongoDB and Redis connections, seeders
│   │   ├── libs/ i18n/ common/ constants/ types/ utils/
│   ├── test/                   # Jest factories, helpers and mocks
│   └── postman-collection.json
├── docs/
│   ├── project-goals.md        # Scope, goals, non-goals, MVP roadmap
│   ├── erd.md                  # Target MongoDB schema
│   ├── unfinished-features.md  # Backlog of UI-without-API features
│   ├── specs/<feature>/        # Per-feature design, plan, e2e and security notes
│   ├── adr/                    # Architecture decision records
│   └── ui-designs/
├── .husky/pre-commit           # Runs lint-staged in client/ then server/
└── package.json                # Root: husky only
```
