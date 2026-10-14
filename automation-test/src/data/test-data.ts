// Constants for test input. No .env, no network: values only.

/** Every throwaway account lives here; cleanup deletes by this domain. */
export const THROWAWAY_DOMAIN = "e2e.example.com";
export const THROWAWAY_PASSWORD = "Throwaway@123";
/** The code planted over a server-issued OTP hash (utils/redis.ts → plantCode). */
export const KNOWN_OTP = "424242";

// ── auth ────────────────────────────────────────────────────────────────────

/** A password that satisfies the strength policy but is never anyone's. */
export const WRONG_PASSWORD = "Wrong@1234";

/**
 * 128 lower-case hex chars — the shape the magic-link verify schema accepts
 * (server/src/validators/schemas/login.ts: 64 random bytes as hex).
 */
export const KNOWN_MAGIC_TOKEN = "ab12".repeat(32);

/** A temporary unlock password the test plants (min length is 12). */
export const KNOWN_TEMP_PASSWORD = "TempUnlock@2026";

/** A POST /auth/signup/complete body that passes validation; override one field. */
export function signupCompleteBody(
  email: string,
  sessionToken: string,
  override: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    email,
    sessionToken,
    password: "Signup@123",
    confirmPassword: "Signup@123",
    acceptTerms: true,
    fullName: "Auth Tester",
    gender: "other",
    dateOfBirth: "1995-06-15",
    ...override
  };
}

// ── notifications ───────────────────────────────────────────────────────────

/**
 * The 26 rows server/src/database/seeders/data/notifications.ts gives
 * user@test.com, newest first: an unusual sign-in, "Atlas Imagery", two
 * password changes, a lockout, then "Seed App 6" … "Seed App 26" (one day
 * apart, read when N is odd). Specs anchor on the Seed App rows — each renders
 * a unique sentence — and on nothing the run itself can produce.
 */
export const seedAppName = (n: number) => `Seed App ${n}`;

export const SEED_NOTIFICATIONS = {
  /** Read-only anchors, never clicked. */
  unreadApp: seedAppName(10),
  readApp: seedAppName(11),
  /** Marked read by TC-NOTIFICATIONS-010 / 014, put back unread in afterAll. */
  markSingleApp: seedAppName(12),
  persistApp: seedAppName(14),
  /** Every APP_AVAILABLE row of the seed. */
  appNames: [
    "Atlas Imagery",
    ...Array.from({ length: 21 }, (_, i) => seedAppName(i + 6))
  ],
  /** The seeded LOGIN_ANOMALY's params. */
  anomaly: {
    reason: "device",
    browser: "Chrome",
    os: "Windows",
    country: "VN"
  },
  /** The seeded ACCOUNT_LOCKED's `params.minutes`. */
  lockedMinutes: 30
} as const;

/**
 * The User-Agent of every API sign-in the notifications suite makes as
 * user@test.com: once its first sign-in is recorded, the device is known and
 * later sign-ins produce no LOGIN_ANOMALY of their own (which would skew an
 * unread-count delta).
 */
export const NOTIFICATIONS_HELPER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 E2E-Helper";

/**
 * Distinct browser/OS pairs with the browser name the server parses out. The
 * real LOGIN_ANOMALY case signs a throwaway account in with the first, then
 * with the second — a device that account has never used.
 */
export const ANOMALY_USER_AGENTS: { ua: string; browser: string }[] = [
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    browser: "Safari"
  },
  {
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
    browser: "Firefox"
  }
];

// ── admin-users ─────────────────────────────────────────────────────────────

/**
 * The toast the client shows for any 5xx once React Query gives up — a literal
 * in client/src/libs/query-client.ts, not a locale string.
 */
export const SERVER_ERROR_TOAST = "Server error. Please try again later.";

/** 24 hex chars: passes the ObjectId check, matches no account. */
export const UNKNOWN_USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

/** Fails the `:id` ObjectId check (400 VALIDATION_ERROR). */
export const MALFORMED_USER_ID = "not-an-object-id";

// ── admin-apps ──────────────────────────────────────────────────────────────

/**
 * Every app a spec registers is named with this prefix; utils/admin-apps.ts →
 * deleteE2EApps removes them (there is no delete endpoint). No seeded app
 * starts with it.
 */
export const E2E_APP_PREFIX = "e2e-";

/** 24 hex chars: passes the ObjectId check, matches no app or category. */
export const UNKNOWN_APP_ID = "000000000000000000000000";

/**
 * The seeded registry (server/src/database/seeders/data/web-apps.ts) by
 * display name. Team Calendar is the only inactive ("Paused") app;
 * Productivity holds Team Calendar + Notes, Internal Tools holds Analytics
 * Dashboard + Operations Console.
 */
export const SEED_APPS = [
  "Blog",
  "Analytics Dashboard",
  "IDMS Portal",
  "Team Calendar",
  "Notes",
  "Operations Console"
] as const;

/**
 * The seeded app the edit specs borrow (active, category Content, role
 * user) and put back afterwards, and the `name` of ANOTHER seeded app used for
 * the rename conflict. CONFLICT_NAME must exist in the seed — otherwise
 * renaming `blog` onto it succeeds and corrupts the seed.
 */
export const EDIT_TARGET_APP = { name: "blog", displayName: "Blog" } as const;
export const CONFLICT_APP_NAME = "notes";

// ── admin-categories ────────────────────────────────────────────────────────

/**
 * Every category a spec creates is named with this prefix; utils/categories.ts
 * → removeE2ECategories deletes them. No seeded category starts with it.
 */
export const E2E_CATEGORY_PREFIX = "E2E ";

/** 24 hex chars: passes the ObjectId check, matches no category or app. */
export const UNKNOWN_CATEGORY_ID = "000000000000000000000000";

/**
 * Seed baseline (server/src/database/seeders/data/web-app-categories.ts), in
 * display order, with how many seeded apps each holds.
 */
export const SEED_CATEGORIES = [
  { slug: "content", en: "Content", vi: "Nội dung", apps: 1 },
  {
    slug: "internal-tools",
    en: "Internal Tools",
    vi: "Công cụ nội bộ",
    apps: 2
  },
  { slug: "identity", en: "Identity", vi: "Định danh", apps: 1 },
  { slug: "productivity", en: "Productivity", vi: "Năng suất", apps: 2 }
] as const;

// ── profile ─────────────────────────────────────────────────────────────────

/**
 * The known profile every /profile e2e test writes onto its throwaway account
 * before opening the page (PATCH /users/me). The form splits fullName at the
 * first space: First Name "Linh", Last Name "Tran Thi".
 */
export const PROFILE_FIXTURE = {
  fullName: "Linh Tran Thi",
  phone: "+84 90 123 4567",
  address: "12 Ly Thai To, Hoan Kiem",
  dateOfBirth: "1990-03-15",
  gender: "female"
} as const;

// ── oidc ────────────────────────────────────────────────────────────────────

/**
 * Prefix of every OAuth client the OIDC specs (and utils/catalog.ts) register;
 * utils/oidc-state.ts → deleteOidcClients keys on it. It also starts with
 * E2E_APP_PREFIX, so no seeded app matches it.
 */
export const OIDC_CLIENT_PREFIX = "e2e-oidc-";

/**
 * Redirect URIs of those clients. The host never resolves: API tests read
 * `Location` with maxRedirects 0, the browser test watches the request to it.
 */
export const OIDC_REDIRECT_URI = "https://rp.e2e.example.com/callback";
export const OIDC_OTHER_REDIRECT_URI = "https://rp.e2e.example.com/other";
export const OIDC_POST_LOGOUT_URI = "https://rp.e2e.example.com/signed-out";

/**
 * The seeded Blog app as an OAuth client (server/src/database/seeders/data/
 * web-apps.ts): requiredRoles ["user"], so an admin reaches it only through
 * the "admins qualify for every app" rule.
 */
export const SEED_BLOG_CLIENT = {
  clientId: "client_blog_8f3a",
  redirectUri: "https://blog.example.com/auth/callback"
} as const;

// ── support ─────────────────────────────────────────────────────────────────

/**
 * Prefix of every support request a SUPPORT spec files; utils/contacts.ts →
 * deleteSupportRequests keys on it (and on the legacy prefix below).
 */
export const SUPPORT_SUBJECT_PREFIX = "E2E support request";
/** Prefix of the older My Requests submit test; swept by the same cleanup. */
export const SUPPORT_LEGACY_SUBJECT_PREFIX = "E2E MyContacts submit";

/** A message that passes every length rule (20…5000 characters). */
export const SUPPORT_MESSAGE =
  "Automated regression request: the dashboard fails to load after sign-in.";

/**
 * The three requests the seed attaches to user@test.com, one per status
 * (server/src/database/seeders/data/contacts.ts + contact.seeder.ts
 * `attachMyContactsOwner`), with the labels My Requests renders for them.
 */
export const SEED_MY_REQUESTS = {
  new: {
    subject: "App crashes on launch after latest update",
    status: "new",
    priority: "high"
  },
  processing: {
    subject: "Billing question about pro plan",
    status: "processing",
    priority: "medium"
  },
  resolved: {
    subject: "Suggestion: dark mode for dashboard",
    status: "resolved",
    priority: "low"
  }
} as const;

/** Seeded as a guest request (userId null): it must never show in anybody's list. */
export const SEED_GUEST_REQUEST_SUBJECT = "Cannot login with Google OAuth";

/** 24 hex chars: a well-formed id no request has. */
export const ABSENT_CONTACT_ID = "ffffffffffffffffffffffff";

// ── admin-contact ───────────────────────────────────────────────────────────

/**
 * Prefix of every request an ADMINCONTACT spec files; utils/contacts.ts →
 * deleteAdminContactRequests keys on it. Distinct from SUPPORT_SUBJECT_PREFIX
 * so one module's cleanup never removes the other's rows mid-run.
 */
export const ADMINCONTACT_SUBJECT_PREFIX = "E2E support ticket";

/** The default message of an ADMINCONTACT request (20…5000 characters). */
export const ADMINCONTACT_MESSAGE =
  "Automated regression request — the dashboard fails to load after sign-in.";
