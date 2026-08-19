# web-app-store-idms — Client

Next.js 15 frontend for **IDMS (Identity Management System)** — a central Identity Provider combined with a launcher portal for a constellation of satellite web apps. Provides the UI for multi-factor auth flows, the OAuth consent screen, an app dashboard (entitlement-aware), user profile / account settings, and admin operations.

## Tech Stack

| Layer           | Technology                                  |
| --------------- | ------------------------------------------- |
| Framework       | Next.js 15 (App Router) + React 19          |
| Language        | TypeScript 5                                |
| Styling         | Tailwind CSS v4 + shadcn/ui + Radix UI      |
| State           | Zustand 5 (client) + React Query 5 (server) |
| Forms           | React Hook Form 7 + Zod 4                   |
| HTTP Client     | Axios 1.12                                  |
| i18n            | next-intl 4 (English / Vietnamese)          |
| Auth            | JWT (access + refresh tokens)               |
| Animations      | Framer Motion 12                            |
| Icons           | Lucide React                                |
| Package Manager | Yarn                                        |

## Prerequisites

- **Node.js** >= 18
- **Yarn** (classic)
- A running [backend server](../server/) (default: `http://localhost:5000`)

## Getting Started

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
# API prefix used by the client (must match server routes)
NEXT_PUBLIC_API_PREFIX=/api/v1

# Backend server URL (Next.js rewrites /api/v1/* to this)
API_SERVER_URL=http://localhost:5000

# (Optional) Public site URL for metadata/SEO
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Note:** All `/api/v1/*` requests are proxied to the backend via `next.config.ts` rewrites. Never hardcode backend URLs in components.

### 3. Start the development server

```bash
yarn dev
```

The app runs at **http://localhost:3000** by default (with Turbopack enabled).

## Available Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `yarn dev`      | Start dev server (Turbopack) |
| `yarn build`    | Create production build      |
| `yarn start`    | Run production server        |
| `yarn lint`     | Run ESLint                   |
| `yarn lint:fix` | Auto-fix lint errors         |
| `yarn format`   | Format code with Prettier    |
| `yarn tsc`      | Type-check only (no emit)    |

## Project Structure

```
src/
├── app/[locale]/              # Next.js App Router (locale-aware)
│   ├── (public)/              # Public routes — no authentication required
│   │   ├── (authen)/          # Login, Signup, Forgot Password
│   │   └── contact-admin/     # Contact support form
│   └── (private)/             # Protected routes — requires authentication
│       ├── (dashboard)/       # User dashboard, profile, login history
│       └── (admin)/           # Admin panel (contacts, login history)
├── views/                     # Page-level view components
├── components/                # Shared/reusable UI components
├── stores/                    # Zustand state stores
├── requests/                  # API request functions (one per feature)
├── hooks/                     # Custom React hooks
├── forms/                     # Form definitions (data + validation)
├── schemas/                   # Shared Zod validation schemas
├── types/                     # TypeScript type definitions
├── libs/                      # Library wrappers (axios, react-query)
├── contexts/                  # React context providers
├── constants/                 # App-wide constants
├── utils/                     # Utility functions
├── locales/                   # i18n translation files (en/, vi/)
├── ghosts/                    # Headless side-effect components
├── dataSources/               # Static UI data (table columns, enums)
├── layouts/                   # Layout components
└── middleware.ts              # Locale routing middleware
```

## Features

### Authentication (✅ in place)

- Email/password login
- OTP-based verification
- Magic link authentication
- Sign up with email verification
- Forgot password (OTP or magic link)

### Identity Provider — OAuth 2.0 / OIDC (⏳ MVP-1)

- Authorization Code + PKCE flow
- Consent screen for first-time satellite app authorization
- RP-initiated logout + back-channel logout to satellites
- ID token carries `locale` claim → cross-app language sync

### App Launcher Dashboard (⏳ MVP-2)

- App tiles filtered by per-user entitlement
- Favorites and Recently Used tracking
- SSO into satellite apps without re-authentication

### User Account

- Profile management (avatar, contact info, security settings)
- Login history (own sessions + device tracking)
- Personal contact information

### Admin Panel

- View and manage user contacts
- Monitor login history across users
- App registry CRUD + entitlement management (⏳ MVP-2)
- Force-logout / lock-unlock / reset-password override (⏳ MVP-4)

### General

- **Dark mode** — toggle via `next-themes`
- **Internationalization** — English (default, no URL prefix) and Vietnamese (`/vi`)
- **Responsive design** — mobile-first with Tailwind CSS
- **Accessibility** — WCAG 2.1 AA compliance with screen reader announcements

## Architecture Overview

```
Request Flow:
  Browser → Next.js Middleware (locale routing only)
         → App Router ([locale])
         → (public) or (private) route group
         → (private) routes pass through AuthGuardLayout
              └── checks JWT tokens in Zustand store
              └── redirects to /login if unauthenticated
              └── TokenRefresher ghost refreshes tokens every 30s

API Flow:
  Component → axiosInstance (with auth interceptors)
           → Next.js rewrite (/api/v1/* → backend)
           → Express API server
```

- **Server Components** render pages and pass data to client components
- **React Query** manages server state with 5 min stale time
- **Zustand** manages client state (auth tokens, UI state)
- **Auth Guard** protects all `(private)` routes at the layout level

## Code Quality

Pre-commit hooks (via Husky + lint-staged) automatically:

1. Format code with Prettier
2. Lint with ESLint and auto-fix where possible
3. Block commits if errors remain

> **Important:** This project uses Yarn. Only commit `yarn.lock` — do not commit `package-lock.json`.

## License

This project is private and not licensed for public distribution.
