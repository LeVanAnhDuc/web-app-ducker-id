# web-app-store-idms — Server

RESTful API server for **IDMS (Identity Management System)** — a central OAuth 2.0 / OIDC Identity Provider combined with a launcher portal for a constellation of satellite web apps. Provides multi-factor auth (password / OTP / magic-link), JWT issuance, user profile as single source of truth, app registry, per-user entitlement, login history, email queue, and admin operations.

## Tech Stack

| Layer           | Technology                             |
| --------------- | -------------------------------------- |
| Runtime         | Node.js + Express                      |
| Language        | TypeScript                             |
| Database        | MongoDB (Mongoose 8)                   |
| Cache / Queue   | Redis (node-redis) + BullMQ            |
| Authentication  | JWT (access + refresh tokens) + bcrypt |
| Validation      | Joi 17                                 |
| Email           | Nodemailer + React Email templates     |
| Documentation   | Swagger UI (OpenAPI)                   |
| Logging         | Winston (daily rotate files)           |
| Testing         | Jest 30 + ts-jest                      |
| Package Manager | Yarn                                   |

## Prerequisites

- **Node.js** >= 18
- **Yarn** (classic)
- **MongoDB** — local instance or remote connection string
- **Redis** — required for rate limiting, caching, and job queues

## Getting Started

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` in the project root and fill in the values:

```env
# ──── Server ────
APP_PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
TRUST_PROXY=loopback

# ──── MongoDB ────
DB_URL=mongodb://localhost:27017
DB_NAME=web_app_store_idms

# ──── Redis ────
REDIS_URL=redis://:password@host:port
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=your-redis-password

# ──── JWT Secrets ────
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ID_SECRET=your-id-secret

# ──── Email (Gmail SMTP) ────
USERNAME_EMAIL=your-email@gmail.com
PASSWORD_EMAIL=your-app-password

# ──── Logging ────
LOG_LEVEL=http
```

> **Note:** All environment variables are accessed through `src/config/env.ts`. Never read `process.env` directly in application code.

> **`TRUST_PROXY` security note:** controls Express's `trust proxy` setting, which determines how `req.ip` resolves the `x-forwarded-for` header (used for login-history IP capture). In production, set it to the number of trusted proxy hops (e.g. `1`) or a trusted proxy subnet — do **not** use `"true"`, as it lets clients spoof the logged IP. The default `loopback` is safe for local development / no-proxy setups.

### 3. Seed the database (optional)

```bash
yarn seed
```

To remove seeded data:

```bash
yarn seed:clear
```

### 4. Start the development server

```bash
yarn dev
```

The server runs at **http://localhost:5000** by default.

**Recommended workflow** (two terminals):

```bash
# Terminal 1 — Development server (fast reload via nodemon)
yarn dev

# Terminal 2 — TypeScript type checking (watch mode)
yarn dev:check
```

Nodemon is configured with `--transpile-only` for fast restarts (1s delay to avoid rapid reloads). Type `rs` in the terminal to force a restart.

## Available Scripts

| Command              | Description                                 |
| -------------------- | ------------------------------------------- |
| `yarn dev`           | Start dev server with nodemon (fast reload) |
| `yarn dev:check`     | TypeScript watch mode (separate terminal)   |
| `yarn type-check`    | One-time TypeScript validation              |
| `yarn build`         | Compile TypeScript to `dist/`               |
| `yarn start`         | Build and run production server             |
| `yarn lint`          | Run ESLint                                  |
| `yarn lint:fix`      | Auto-fix lint errors                        |
| `yarn format`        | Format code with Prettier                   |
| `yarn test`          | Run Jest tests                              |
| `yarn test:coverage` | Run tests with coverage report              |
| `yarn test:watch`    | Jest in watch mode                          |
| `yarn seed`          | Populate database with seed data            |
| `yarn seed:clear`    | Remove seeded data                          |

## Project Structure

```
src/
├── server.ts                  # Entry point — boots the app with graceful shutdown
├── app.ts                     # Express app setup (CORS, Helmet, body parser, i18n)
├── config/                    # Global configuration
│   ├── env.ts                 # Environment variable access (single source of truth)
│   ├── logger.ts              # Winston logger setup
│   ├── cookie.ts              # Cookie configuration
│   └── responses/             # Standardized success/error response classes
├── database/                  # Database connections and seeders
│   ├── mongodb/               # MongoDB connection (Mongoose)
│   ├── redis/                 # Redis connection (node-redis)
│   └── seeders/               # Database seed scripts
├── loaders/                   # Boot sequence orchestrator
├── models/                    # Mongoose schemas and models
├── modules/                   # Feature modules (see API Endpoints below)
│   ├── authentication/        # Core auth logic, JWT, guards
│   ├── signup/                # User registration
│   ├── login/                 # Login with device tracking
│   ├── logout/                # Session invalidation
│   ├── token/                 # Token refresh
│   ├── forgot-password/       # Password reset flow
│   ├── unlock-account/        # Account unlock after failed attempts
│   ├── login-history/         # Login history tracking
│   ├── user/                  # User profile management
│   ├── contact-admin/         # Contact form submissions
│   └── apps/blog/             # Blog (will be split into a satellite app — see docs/project-goals.md MVP-3)
├── services/                  # Cross-cutting services
│   ├── email/                 # Email service (Nodemailer + React Email)
│   └── queue/                 # BullMQ job queue
├── middlewares/               # Express middleware
│   ├── guards/                # Auth guards (authGuard, adminGuard)
│   ├── pipes/                 # Validation pipes (body, params, query)
│   ├── RateLimiterMiddleware/ # Redis-backed rate limiting
│   └── error-handler/         # Global error handler
├── validators/                # Joi schemas and validation constants
├── types/                     # TypeScript type definitions
├── constants/                 # App-wide constants
├── i18n/                      # Internationalization (i18next)
└── utils/                     # Utilities (logger, retry, circuit-breaker)
```

### Module Structure

Each feature module follows a consistent pattern:

```
modules/{feature}/
├── {feature}.module.ts        # Factory — wires dependencies, exports routes
├── {feature}.controller.ts    # Request handlers
├── {feature}.routes.ts        # Express router with validation middleware
├── {feature}.service.ts       # Business logic
├── {feature}.helper.ts        # Module-specific helpers (optional)
├── dtos/                      # Data Transfer Objects (optional)
├── repositories/              # Data access layer (optional)
└── swagger/                   # OpenAPI docs for the module (optional)
```

## API Endpoints

### Health Check

| Method | Endpoint  | Description              |
| ------ | --------- | ------------------------ |
| GET    | `/health` | MongoDB and Redis status |

### Authentication

| Method | Endpoint                       | Description                  |
| ------ | ------------------------------ | ---------------------------- |
| POST   | `/api/v1/auth/signup`          | Register a new user          |
| POST   | `/api/v1/auth/signup/verify`   | Verify signup OTP            |
| POST   | `/api/v1/auth/login`           | Log in (email/password)      |
| POST   | `/api/v1/auth/logout`          | Log out (invalidate session) |
| POST   | `/api/v1/auth/token`           | Refresh access token         |
| POST   | `/api/v1/auth/forgot-password` | Request password reset       |
| POST   | `/api/v1/auth/unlock`          | Unlock locked account        |

### User

| Method | Endpoint           | Description              |
| ------ | ------------------ | ------------------------ |
| GET    | `/api/v1/users/me` | Get current user profile |
| PATCH  | `/api/v1/users/me` | Update current user      |

### Login History

| Method | Endpoint                      | Description                  |
| ------ | ----------------------------- | ---------------------------- |
| GET    | `/api/v1/login-history`       | Get user's own login history |
| GET    | `/api/v1/admin/login-history` | Get all users' login history |

### Contact Admin

| Method | Endpoint                     | Description                     |
| ------ | ---------------------------- | ------------------------------- |
| POST   | `/api/v1/contact`            | Submit a contact form           |
| GET    | `/api/v1/admin/contacts`     | List all contacts (admin only)  |
| GET    | `/api/v1/admin/contacts/:id` | Get contact detail (admin only) |

### App Registry

| Method | Endpoint                        | Description                                                                                       |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/admin/apps`            | List all apps (admin only). Query params: `search`, `status` (`active`\|`inactive`), `categoryId` |
| GET    | `/api/v1/admin/apps/categories` | List all app categories (admin only)                                                              |

### Blog

| Method | Endpoint                 | Description      |
| ------ | ------------------------ | ---------------- |
| GET    | `/api/v1/apps/blogs`     | List blog posts  |
| POST   | `/api/v1/apps/blogs`     | Create blog post |
| GET    | `/api/v1/apps/blogs/:id` | Get blog post    |
| PATCH  | `/api/v1/apps/blogs/:id` | Update blog post |
| DELETE | `/api/v1/apps/blogs/:id` | Delete blog post |

> Full interactive API documentation is available at **`/api-docs`** (Swagger UI) when the server is running.

## Architecture

### Boot Sequence

```
server.ts → loadAll(app):
  1. loadDatabase()      — connect to MongoDB
  2. loadRedis()         — connect to Redis
  3. loadServices()      — create cross-cutting services (email, etc.)
  4. loadQueues()        — create BullMQ queues/workers, mount Bull Board
  5. loadModules()       — wire feature modules, mount routes
  6. loadErrorHandlers() — 404 handler → Mongoose error parser → global error handler
```

### Request Lifecycle

```
Incoming Request
  → CORS → Helmet → Body Parser → Cookie Parser → i18n Middleware
  → Rate Limiter → Validation Pipe (bodyPipe / paramsPipe / queryPipe)
  → asyncHandler(controller)
  → Success: res.json({ timestamp, path, message, data, meta? })
  → Error:   next(error) → Global Error Handler → standardized error response
```

### Graceful Shutdown

On `SIGINT` or `SIGTERM`, the server:

1. Stops accepting new connections
2. Waits up to 30 seconds for in-flight requests to complete
3. Closes BullMQ queues, MongoDB, and Redis connections
4. Exits the process

## Key Features

### Authentication & Security

- **JWT tokens** — access + refresh tokens stored in HttpOnly secure cookies
- **Auth guards** — `authGuard()`, `adminGuard()`, `optionalAuthGuard()` middleware
- **Password hashing** — bcrypt with configurable salt rounds
- **Rate limiting** — Redis-backed, per-module limits (login, signup, forgot-password)
- **Security headers** — Helmet middleware enabled by default
- **Account locking** — automatic lock after repeated failed login attempts

### Email Service

- **Templates** — React Email components (OTP, magic link, password reset, etc.)
- **Resilience** — circuit breaker (5 failures → 30s cooldown) + exponential backoff retry
- **Queue mode** — sends via BullMQ when Redis is available; falls back to direct send
- **Dead Letter Queue** — failed emails are preserved for inspection
- **Monitoring** — Bull Board dashboard at `/admin/queues`

### Logging & Observability

- **Winston** — structured logging with daily rotating files in `logs/`
- **Request tracking** — unique `requestId` per request for tracing
- **Log levels** — configurable via `LOG_LEVEL` env variable
- **Health endpoint** — `/health` reports MongoDB and Redis status with latency

### Error Handling

All errors are caught by `asyncHandler` and processed by the global error handler into a consistent JSON format.

| Error Class               | HTTP Status |
| ------------------------- | ----------- |
| `BadRequestError`         | 400         |
| `ValidationError`         | 400         |
| `UnauthorizedError`       | 401         |
| `ForbiddenError`          | 403         |
| `NotFoundError`           | 404         |
| `ConflictRequestError`    | 409         |
| `TooManyRequestsError`    | 429         |
| `ServiceUnavailableError` | 503         |

## Code Quality

- **ESLint** — code quality and coding standards enforcement
- **Prettier** — automatic code formatting
- **Husky** — pre-commit hooks
- **lint-staged** — auto-lint and format on commit

> **Important:** This project uses Yarn. Only commit `yarn.lock` — do not commit `package-lock.json`.

## Documentation

Detailed technical documentation is available in the [`.doc/`](./.doc/) directory:

- [Project Overview](./.doc/PROJECT_OVERVIEW.md) — architecture and coding standards
- [Logger System Guide](./.doc/logger.md) — Winston logger usage
- [Nodemon Configuration](./.doc/nodemon-config.md) — development server setup
- [Code Quality Tools](./.doc/code-quality-tools.md) — ESLint, Prettier, Husky, lint-staged

## License

This project is private and not licensed for public distribution.
