# Requirements catalogue

The list of behaviours the regression suite must prove. It is derived from the
`## Features` section of the root `README.md` (what has shipped) — not from
`docs/project-goals.md` (what is planned). A requirement that is planned but not
built is listed under [Out of scope](#out-of-scope) so it is visibly not
forgotten.

**Rules**

- An ID is permanent. A changed requirement keeps its ID and gets its text
  updated; a removed one is struck through and marked `Removed (YYYY-MM-DD)`,
  never renumbered or reused.
- Every requirement has at least one test case in `test-cases/<module>.md`.
  `pnpm coverage:check` fails when one does not.
- A new feature adds its requirements here **in the same branch** as the code,
  before the test cases that cover them.

Module codes match the file names under `test-cases/`.

## AUTH — sign-in, sign-up, lockout, session

| ID          | Requirement                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| REQ-AUTH-01 | The login screen asks for an email first; a known address continues to the password step.                                    |
| REQ-AUTH-02 | An unknown address is sent a sign-up code automatically and continues into registration.                                     |
| REQ-AUTH-03 | Sign-up requires verifying a 6-digit emailed code (with resend and cooldown) before the account exists.                      |
| REQ-AUTH-04 | Sign-up finishes with full name, gender, date of birth and a password meeting the strength policy, plus accepting the terms. |
| REQ-AUTH-05 | A user can sign in with email + password.                                                                                    |
| REQ-AUTH-06 | A user can sign in with a one-time code sent to their email.                                                                 |
| REQ-AUTH-07 | A user can sign in with a magic link sent to their email.                                                                    |
| REQ-AUTH-08 | The alternative-methods screen switches between password, code and magic link mid-flow.                                      |
| REQ-AUTH-09 | Too many wrong passwords lock the account temporarily, and the message says for how long.                                    |
| REQ-AUTH-10 | A locked user can request an unlock code by email and verify it to get back in.                                              |
| REQ-AUTH-11 | Inactive and unverified accounts cannot sign in.                                                                             |
| REQ-AUTH-12 | Sign-in endpoints are rate limited per IP and per email.                                                                     |
| REQ-AUTH-13 | The session survives a reload through the refresh-token cookie; the access token is never persisted in the browser.          |
| REQ-AUTH-14 | Logout ends the session; the old refresh token no longer works.                                                              |
| REQ-AUTH-15 | Signed-in users are kept out of guest pages (login, sign-up) and guests are kept out of private pages.                       |

## PASSWORD — password recovery and change

| ID              | Requirement                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| REQ-PASSWORD-01 | Forgot-password by one-time code, then set a new password.                                               |
| REQ-PASSWORD-02 | Forgot-password by magic link, then set a new password.                                                  |
| REQ-PASSWORD-03 | A user changes their own password from the profile page, giving the current one.                         |
| REQ-PASSWORD-04 | After an admin reset the user is forced to a change-password screen and cannot use the rest of the site. |
| REQ-PASSWORD-05 | A password change or reset invalidates the user's other sessions.                                        |

## HOME — launcher dashboard

| ID          | Requirement                                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| REQ-HOME-01 | Home greets the user by time of day.                                               |
| REQ-HOME-02 | "Jump back in" shows the apps the user actually opened last.                       |
| REQ-HOME-03 | Home charts sign-in activity per day over 7, 30 or 90 days in the user's timezone. |
| REQ-HOME-04 | Home breaks sign-ins down by method and device.                                    |
| REQ-HOME-05 | Every figure on Home links to the matching filtered list.                          |
| REQ-HOME-06 | Home ranks the apps the user opens most, over the whole history.                   |

## APPS — app catalogue and search

| ID          | Requirement                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-APPS-01 | `/apps` lists every active app the user may open: the apps their role allows, plus any an admin granted beyond the role, minus any an admin revoked; a change shows on the next load. |
| REQ-APPS-02 | `/apps` supports text search, category filter, grid/list toggle and pagination, kept in the URL.                                                                                      |
| REQ-APPS-03 | Opening a tile launches the app's own URL in a new tab and records the launch.                                                                                                        |
| REQ-APPS-04 | Header search finds apps as you type, with keyboard navigation, and opens one or jumps to the list.                                                                                   |
| REQ-APPS-05 | Category names render in the active locale (English / Vietnamese).                                                                                                                    |
| REQ-APPS-06 | An app the user may not open is never found by `/apps` search, even by its exact name.                                                                                                |

## FAVORITES — favourites

| ID               | Requirement                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| REQ-FAVORITES-01 | A user stars or unstars any app from its tile.                                                                        |
| REQ-FAVORITES-02 | `/favorites` shows only the user's starred apps.                                                                      |
| REQ-FAVORITES-03 | Favourites persist across reloads and are private to the user.                                                        |
| REQ-FAVORITES-04 | A starred app whose access was revoked is hidden from `/favorites`, not deleted, and returns when access is restored. |

## RECENTLYUSED — recently used

| ID                  | Requirement                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| REQ-RECENTLYUSED-01 | `/recently-used` lists each opened app once, newest first, grouped Today / Yesterday / This Week / Earlier.         |
| REQ-RECENTLYUSED-02 | Each row shows the last-opened time and the open count.                                                             |
| REQ-RECENTLYUSED-03 | Search and infinite scroll over the history.                                                                        |
| REQ-RECENTLYUSED-04 | Remove one app with Undo, or clear the whole history after a confirmation.                                          |
| REQ-RECENTLYUSED-05 | Signing in to a satellite app through Ducker ID also records the app as used.                                       |
| REQ-RECENTLYUSED-06 | An app whose access was revoked drops out of `/recently-used` and returns, history intact, when access is restored. |

## LOGINHISTORY — my login history

| ID                  | Requirement                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| REQ-LOGINHISTORY-01 | A user sees their own sign-in attempts: method, result and reason, IP, location, device, OS, browser, anomaly flag. |
| REQ-LOGINHISTORY-02 | Each row shows where the sign-in happened — Ducker ID or a satellite app — and SSO sign-ins carry an "Auto" badge.  |
| REQ-LOGINHISTORY-03 | The list filters by result, method, device, app and date and paginates.                                             |
| REQ-LOGINHISTORY-04 | A user never sees another user's attempts.                                                                          |

## NOTIFICATIONS — notifications

| ID                   | Requirement                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-NOTIFICATIONS-01 | The header shows an unread badge and a panel with the latest notifications, its own empty and error states, Mark all and View all.                                                        |
| REQ-NOTIFICATIONS-02 | `/notifications` lists notifications newest first, grouped Today / Yesterday / Earlier, with Load more, empty and error (retry) states.                                                   |
| REQ-NOTIFICATIONS-03 | A user marks one notification, or all of them, as read.                                                                                                                                   |
| REQ-NOTIFICATIONS-04 | Real events notify the user: password changed by themselves or reset by an admin, account locked by wrong passwords, a sign-in from a new device or country, a new app in their launcher. |
| REQ-NOTIFICATIONS-05 | The list has All / Unread / Read tabs and a type filter (security, account, apps, system); the two combine.                                                                               |
| REQ-NOTIFICATIONS-06 | Opening a notification marks it read and follows its internal link; an unusual sign-in offers "Not you? Change your password"; a link that is not an internal path is never rendered.     |
| REQ-NOTIFICATIONS-07 | Notifications are rendered from their type and parameters in the reader's language (English / Vietnamese), country names included.                                                        |
| REQ-NOTIFICATIONS-08 | The unread badge refreshes on its own every minute.                                                                                                                                       |

## SUPPORT — support requests

| ID             | Requirement                                                                          |
| -------------- | ------------------------------------------------------------------------------------ |
| REQ-SUPPORT-01 | A signed-in user or a guest submits a support request from the support dialog.       |
| REQ-SUPPORT-02 | `/contacts/me` lists the requests the user submitted, with ticket ID and status.     |
| REQ-SUPPORT-03 | A request opens on a read-only detail page; another user's request is not reachable. |

## PROFILE — profile

| ID             | Requirement                                                                          |
| -------------- | ------------------------------------------------------------------------------------ |
| REQ-PROFILE-01 | A user views their profile: full name, email, phone, date of birth, gender, address. |
| REQ-PROFILE-02 | A user edits full name, phone, date of birth, gender and address, with validation.   |

## SETTINGS — language, appearance, formatting

| ID              | Requirement                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| REQ-SETTINGS-01 | English (no prefix) and Vietnamese (`/vi`) are switched from the user menu. |
| REQ-SETTINGS-02 | Light, dark or system theme is chosen from the user menu and persists.      |
| REQ-SETTINGS-03 | Dates and times render in the active locale's format.                       |
| REQ-SETTINGS-04 | Removed features (Team) leave no route or navigation entry behind.          |

## OIDC — single sign-on for satellite apps

| ID          | Requirement                                                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-OIDC-01 | Discovery at `/.well-known/openid-configuration` and public keys at `/.well-known/jwks.json`.                                                                                                   |
| REQ-OIDC-02 | `/oauth/authorize` implements Authorization Code with PKCE S256, required for every client.                                                                                                     |
| REQ-OIDC-03 | Authorization codes live 60 seconds and are single-use.                                                                                                                                         |
| REQ-OIDC-04 | `/oauth/token` exchanges a code for RS256-signed ID and access tokens; confidential clients authenticate with a secret, public clients do not.                                                  |
| REQ-OIDC-05 | An existing Ducker ID session returns straight to the app with no screen in between.                                                                                                            |
| REQ-OIDC-06 | `prompt=none` checks for a session without ever showing a login screen.                                                                                                                         |
| REQ-OIDC-07 | `/oauth/userinfo` returns the user's claims for a valid access token.                                                                                                                           |
| REQ-OIDC-08 | Invalid client, redirect URI, scope or verifier is rejected without redirecting to an unregistered URI.                                                                                         |
| REQ-OIDC-09 | `/oauth/logout` ends the identity-provider session.                                                                                                                                             |
| REQ-OIDC-10 | `/oauth/authorize` lets a user into an app only if they may open it — role default, an admin's grant beyond the role, never after a revoke (`access_denied`); an admin qualifies for every app. |

## OPS — operator tooling

| ID         | Requirement                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| REQ-OPS-01 | `/health` reports MongoDB and Redis status.                                                            |
| REQ-OPS-02 | Swagger UI at `/api-docs` and the document at `/api-docs.json`.                                        |
| REQ-OPS-03 | Every API error uses the `{ code, message, timestamp, path }` envelope, translated per request locale. |

## AUTHZ — access control

| ID           | Requirement                                                                             |
| ------------ | --------------------------------------------------------------------------------------- |
| REQ-AUTHZ-01 | Guests are redirected from private pages to login and get 401 from protected endpoints. |
| REQ-AUTHZ-02 | A non-admin is denied every `/admin` page and every admin endpoint (403).               |
| REQ-AUTHZ-03 | `/admin` is a landing page linking to each admin area.                                  |

## ADMINAPPS — admin app registry

| ID               | Requirement                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| REQ-ADMINAPPS-01 | `/admin/apps` lists registered apps with search, status and category filters and column controls.                                |
| REQ-ADMINAPPS-02 | An admin creates an app with its OAuth settings (URIs, grant/response types, scopes, token auth method, 1–5 ordered categories). |
| REQ-ADMINAPPS-03 | A client ID and secret are generated on creation; the secret is shown once with a copy button.                                   |
| REQ-ADMINAPPS-04 | An admin edits an existing app.                                                                                                  |
| REQ-ADMINAPPS-05 | An admin activates or deactivates an app with a status switch.                                                                   |

## ADMINCATEGORIES — admin categories

| ID                     | Requirement                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| REQ-ADMINCATEGORIES-01 | `/admin/categories` lists categories with their names in English and Vietnamese.                         |
| REQ-ADMINCATEGORIES-02 | An admin creates and renames a category; the slug follows the English name and stays unique.             |
| REQ-ADMINCATEGORIES-03 | An admin reorders categories.                                                                            |
| REQ-ADMINCATEGORIES-04 | Deleting a category moves its sole-category apps to one shared category or to a category chosen per app. |

## ADMINUSERS — admin user accounts

| ID                | Requirement                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| REQ-ADMINUSERS-01 | `/admin/users` lists accounts with search plus role and status filters. |
| REQ-ADMINUSERS-02 | An admin locks and unlocks an account; a locked account cannot sign in. |
| REQ-ADMINUSERS-03 | An admin resets a user's password; a temporary password is issued.      |

## ADMINLOGINHISTORY — admin login history

| ID                       | Requirement                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| REQ-ADMINLOGINHISTORY-01 | `/admin/login-history` shows sign-in attempts across all accounts, filterable. |
| REQ-ADMINLOGINHISTORY-02 | Each entry opens on a detail page, including its app source.                   |

## ADMINCONTACT — admin support inbox

| ID                  | Requirement                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| REQ-ADMINCONTACT-01 | `/admin/contact` lists incoming support requests with search and filters. |
| REQ-ADMINCONTACT-02 | Each request opens on a detail view.                                      |
| REQ-ADMINCONTACT-03 | Status follows the workflow `new → processing → resolved`.                |

## ADMINENTITLEMENTS — admin entitlements

| ID                       | Requirement                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-ADMINENTITLEMENTS-01 | `/admin/entitlements` shows a user × app matrix for the users picked in a user picker; each cell starts at what the user's role allows.                                                           |
| REQ-ADMINENTITLEMENTS-02 | An admin grants an app beyond the role or revokes one despite it; the exception is saved, survives a reload and is marked with its direction; setting a cell back to the role default removes it. |
| REQ-ADMINENTITLEMENTS-03 | The entitlement admin API refuses guests (401) and non-admins (403).                                                                                                                              |
| REQ-ADMINENTITLEMENTS-04 | The user is notified whenever their effective access to an app changes — granted (with a link to the app) or revoked — and not when a save leaves it as it was.                                   |

## Out of scope

Not built, so not tested. Each line names where it is tracked.

- Consent screen, `/oauth/introspect`, `/oauth/revoke`, refresh-token grant, back-channel logout — `docs/unfinished-features.md`.
- Admin force logout, Billing cards, Profile stat badges — still read from `@/mocks` (root `CLAUDE.md` → "Still mock-backed").
- Server unit tests — they live beside the code in `server/src/**/*.spec.ts` and run with `cd server && pnpm test`.
- Performance, visual regression and automated a11y scanning — see `docs/test-strategy.md` → "Not covered".
