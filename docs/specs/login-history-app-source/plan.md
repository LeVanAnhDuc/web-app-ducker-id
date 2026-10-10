# Plan — login-history-app-source

Design: `design.md`. Mock: `docs/ui-designs/login-history-app-source/login-history-app-column.html`.

## Task 1 — BE: dữ liệu và query

- [x] `modules/login-history/constants`: `LOGIN_SOURCES`, `LOGIN_METHODS.SSO`, `LOGIN_FAIL_REASONS.NOT_ENTITLED`
- [x] `types`: `LoginSource`, `LoginEventApp`, `PopulatedLoginWebApp`, 4 trường mới trên document, create data, payload, filter, query
- [x] `models/login-history.ts`: `source`, `webAppId` (ref `WebApp`), `clientName`, `interactive` + 2 index
- [x] `validators/schemas/login-history.ts`: `source`, `webAppId` (ObjectId), `interactive` (boolean) và message i18n `validation:*`
- [x] `helpers.buildLoginHistoryFilter` + `repository.toMongoFilter`. Lọc `idp`/`interactive=true` bằng `$ne` để dòng cũ thiếu trường vẫn khớp
- [x] Repository: populate `webAppId` (`displayName iconUrl`) ở `findByUser`, `findAll`, `findById`. Stats loại `method = sso`
- [x] DTO: `toLoginAppFieldsDto` (fallback cho dòng cũ và app đã xoá), gắn vào `MyHistoryItemDto` / `AllHistoryItemDto`

## Task 2 — BE: ghi sự kiện ở OAuth

- [x] `LoginHistoryService.recordAppSignIn` / `recordAppSignInDenied`. `logLoginAttempt` ghi `source = oauth` khi có `app`
- [x] `OAuthService` nhận `loginHistoryService` (`oauth.module.ts`, `modules.loader.ts`)
- [x] `authorize`: ghi sau `issueCode`. `assertEntitled` ghi denied trước khi throw. Không ghi ở nhánh `login`/`prompt=none`
- [x] `isInteractiveSignIn`: có `auth_req` **và** `auth_time` còn trong TTL của pending request
- [x] `auditAppSignIn` fire-and-forget, lookup email trong đó, nuốt lỗi

## Task 3 — BE tests

- [x] `oauth.service.spec.ts` (7 case: im lặng / interactive / resume trên phiên cũ / denied / prompt=none / nhánh login / lookup lỗi vẫn redirect)
- [x] `login-app.dto.spec.ts` (dòng cũ / populate / app đã xoá / dòng idp có ref lạc)
- [x] `login-history.service.spec.ts` (+3 case ghi dòng)

## Task 4 — FE

- [x] `constants/loginHistory.ts`: `METHOD.SSO`, `SOURCE`, `APP_FILTER_IDP`, `SIGN_IN_FILTER`. `types/LoginHistory`: `source`, `app`, `interactive` + query params
- [x] `components/LoginAppLabel` (icon / chữ cái đầu / logo IdP + badge "Tự động")
- [x] `dataSources/LoginHistory`: `buildLoginAppFilterDefs(apps, scope)`, `toLoginAppQueryParams(filters, scope)`, cột "Ứng dụng" ở bảng user + admin, màu cho `sso`
- [x] `hooks/useLoginAppOptions` (catalog app, `limit = 100`)
- [x] `LoginHistoryTable`, `AdminLoginHistoryTable`, `LoginHistoryDetailCard`
- [x] i18n `locales/{en,vi}/loginHistory.json`

## Task 5 — Docs

- [x] `docs/erd.md`, changelog `docs/project-goals.md`, ghi chú nguồn dữ liệu cho RecentlyUsed ở `docs/unfinished-features.md`, README `## Features`

## Task 6 — E2E + verify

- [x] `e2e/login-history/login-history-app-source.e2e.ts`, `e2e/admin-login-history/admin-login-history-app-source.e2e.ts`. Stub cũ thêm 3 trường mới
- [x] BE: lint, type-check, test, build. FE: lint, `tsc --noEmit`, build
- [ ] E2E real-SSO (2 case) cần DB đã seed. Xem `e2e.md`
