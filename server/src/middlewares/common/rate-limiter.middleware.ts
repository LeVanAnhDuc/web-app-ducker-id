// libs
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
// types
import type { Request, Response } from "express";
import type { createClient } from "redis";
// common
import { TooManyRequestsError } from "@/exceptions";
// others
import { RATE_LIMIT_CONFIG as C } from "@/constants/redis/rate-limit";
import { RequestContext } from "@/utils/request-context";

type RedisClient = ReturnType<typeof createClient>;
type KeyGenerator = (req: Request) => string;

interface LimitConfig {
  KEY: string;
  MAX_REQUESTS: number;
  WINDOW_SECONDS: number;
}

/**
 * Per-email limiters run before `bodyPipe`, so the body is still unvalidated:
 * `email` may be a number, a boolean or an array. Anything but a non-empty
 * string shares the "unknown" bucket and is then refused by validation (400),
 * instead of throwing here and surfacing as a 500.
 */
export const emailRateLimitKey: KeyGenerator = (req) => {
  const email: unknown = req.body?.email;
  return typeof email === "string" && email ? email.toLowerCase() : "unknown";
};

const byIp: KeyGenerator = (req) => req.ip ?? "unknown";

// Both need an authenticated request: the route's auth guard must run first
const byIpAndAuth: KeyGenerator = (req) =>
  `${req.ip ?? "unknown"}:${RequestContext.requireAuthId()}`;
const byUser: KeyGenerator = () => RequestContext.requireUserId();

/**
 * Every limiter, by the name routes use (`rl.loginByIp`). The Redis prefix,
 * window and ceiling come from RATE_LIMIT_CONFIG; with no key generator the
 * library's default (the client IP) is used.
 */
export const RATE_LIMITS = {
  loginByIp: [C.LOGIN.PASSWORD.PER_IP, "login:errors.rateLimitExceeded"],
  loginOtpByIp: [C.LOGIN.OTP.PER_IP, "login:errors.rateLimitExceeded"],
  loginOtpByEmail: [
    C.LOGIN.OTP.PER_EMAIL,
    "login:errors.rateLimitExceeded",
    emailRateLimitKey
  ],
  magicLinkByIp: [C.LOGIN.MAGIC_LINK.PER_IP, "login:errors.rateLimitExceeded"],
  magicLinkByEmail: [
    C.LOGIN.MAGIC_LINK.PER_EMAIL,
    "login:errors.rateLimitExceeded",
    emailRateLimitKey
  ],

  signupOtpByIp: [C.SIGNUP.SEND_OTP.PER_IP, "signup:errors.rateLimitExceeded"],
  signupOtpByEmail: [
    C.SIGNUP.SEND_OTP.PER_EMAIL,
    "signup:errors.rateLimitExceeded",
    emailRateLimitKey
  ],
  checkEmailByIp: [
    C.SIGNUP.CHECK_EMAIL.PER_IP,
    "signup:errors.rateLimitExceeded"
  ],

  forgotPasswordOtpByIp: [
    C.FORGOT_PASSWORD.OTP.PER_IP,
    "forgotPassword:errors.rateLimitExceeded"
  ],
  forgotPasswordOtpByEmail: [
    C.FORGOT_PASSWORD.OTP.PER_EMAIL,
    "forgotPassword:errors.rateLimitExceeded",
    emailRateLimitKey
  ],
  forgotPasswordMagicLinkByIp: [
    C.FORGOT_PASSWORD.MAGIC_LINK.PER_IP,
    "forgotPassword:errors.rateLimitExceeded"
  ],
  forgotPasswordMagicLinkByEmail: [
    C.FORGOT_PASSWORD.MAGIC_LINK.PER_EMAIL,
    "forgotPassword:errors.rateLimitExceeded",
    emailRateLimitKey
  ],
  forgotPasswordResetByIp: [
    C.FORGOT_PASSWORD.RESET.PER_IP,
    "forgotPassword:errors.rateLimitExceeded"
  ],

  changePasswordByIpAndUser: [
    C.CHANGE_PASSWORD.PER_IP_USER,
    "changePassword:errors.rateLimitExceeded",
    byIpAndAuth
  ],
  contactByIp: [
    C.CONTACT.SUBMIT.PER_IP,
    "contactAdmin:errors.rateLimitExceeded"
  ],
  updateProfileByIp: [
    C.USER.UPDATE_PROFILE.PER_IP,
    "user:errors.rateLimitExceeded"
  ],
  adminUserMutationByIpAndUser: [
    C.USER.ADMIN_MUTATION.PER_IP_USER,
    "user:errors.rateLimitExceeded",
    byIpAndAuth
  ],

  categoriesByIp: [
    C.CATEGORIES.PER_IP,
    "category:errors.rateLimitExceeded",
    byIp
  ],
  categoryMutationByIpAndUser: [
    C.CATEGORIES.MUTATION.PER_IP_USER,
    "category:errors.rateLimitExceeded",
    byIpAndAuth
  ],
  entitlementMutationByIpAndUser: [
    C.ENTITLEMENTS.MUTATION.PER_IP_USER,
    "entitlement:errors.rateLimitExceeded",
    byIpAndAuth
  ],
  recordRecentAppByUser: [
    C.RECENT_APP.RECORD.PER_USER,
    "recentApp:errors.rateLimitExceeded",
    byUser
  ]
} as const satisfies Record<
  string,
  readonly [LimitConfig, I18n.Key, KeyGenerator?]
>;

export type RateLimitName = keyof typeof RATE_LIMITS;
export type RateLimiters = Record<RateLimitName, RateLimitRequestHandler>;

/**
 * A user-keyed limiter reads the authenticated user, so it must run after the
 * route's auth guard; an IP- or email-keyed one runs before it.
 */
export const isUserKeyed = (name: RateLimitName): boolean => {
  const [, , keyGenerator] = RATE_LIMITS[name] as readonly [
    LimitConfig,
    I18n.Key,
    KeyGenerator?
  ];
  return keyGenerator === byIpAndAuth || keyGenerator === byUser;
};

/** Answers 429 in the app's error envelope, translated for the request. */
const tooManyRequests =
  (messageKey: I18n.Key) =>
  (req: Request, res: Response): void => {
    const error = new TooManyRequestsError({ key: messageKey });
    const body: ErrorPattern = {
      code: error.code,
      message: req.t(messageKey),
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    };

    res.status(error.status).json(body);
  };

/** Builds every limiter once, after Redis has connected. */
export const createRateLimiters = (redisClient: RedisClient): RateLimiters =>
  Object.fromEntries(
    Object.entries(RATE_LIMITS).map(
      ([name, [config, messageKey, keyGenerator]]) => [
        name,
        rateLimit({
          windowMs: config.WINDOW_SECONDS * 1000,
          max: config.MAX_REQUESTS,
          store: new RedisStore({
            sendCommand: (...args: string[]) => redisClient.sendCommand(args),
            prefix: config.KEY
          }),
          standardHeaders: true,
          legacyHeaders: false,
          ...(keyGenerator && { keyGenerator }),
          handler: tooManyRequests(messageKey)
        })
      ]
    )
  ) as RateLimiters;
