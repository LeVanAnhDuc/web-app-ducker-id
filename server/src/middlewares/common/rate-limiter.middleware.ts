// libs
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
// types
import type { Request, Response } from "express";
import type { createClient } from "redis";
// common
import { TooManyRequestsError } from "@/common/exceptions";
// others
import { RATE_LIMIT_CONFIG } from "@/constants/redis/rate-limit";
import { RequestContext } from "@/utils/request-context";

type RedisClient = ReturnType<typeof createClient>;
type RateLimitHandler = (req: Request, res: Response) => void;

export class RateLimiterMiddleware {
  private readonly redisClient: RedisClient;

  // All limiters are initialized once in the constructor after Redis connects.
  // loadRateLimiters() runs before loadModules(app), so by the time controllers
  // access these properties during initRoutes(), they are guaranteed to be ready.
  public readonly loginByIp: RateLimitRequestHandler;
  public readonly signupOtpByIp: RateLimitRequestHandler;
  public readonly signupOtpByEmail: RateLimitRequestHandler;
  public readonly checkEmailByIp: RateLimitRequestHandler;
  public readonly loginOtpByIp: RateLimitRequestHandler;
  public readonly loginOtpByEmail: RateLimitRequestHandler;
  public readonly magicLinkByIp: RateLimitRequestHandler;
  public readonly magicLinkByEmail: RateLimitRequestHandler;
  public readonly forgotPasswordOtpByIp: RateLimitRequestHandler;
  public readonly forgotPasswordOtpByEmail: RateLimitRequestHandler;
  public readonly forgotPasswordMagicLinkByIp: RateLimitRequestHandler;
  public readonly forgotPasswordMagicLinkByEmail: RateLimitRequestHandler;
  public readonly forgotPasswordResetByIp: RateLimitRequestHandler;
  public readonly changePasswordByIpAndUser: RateLimitRequestHandler;
  public readonly contactByIp: RateLimitRequestHandler;
  public readonly updateProfileByIp: RateLimitRequestHandler;
  public readonly categoriesByIp: RateLimitRequestHandler;
  public readonly adminUserMutationByIpAndUser: RateLimitRequestHandler;

  constructor(redisClient: RedisClient) {
    this.redisClient = redisClient;

    this.loginByIp = rateLimit({
      windowMs: RATE_LIMIT_CONFIG.LOGIN.PASSWORD.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.LOGIN.PASSWORD.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(RATE_LIMIT_CONFIG.LOGIN.PASSWORD.PER_IP.KEY),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "login:errors.rateLimitExceeded"
      )
    });

    this.signupOtpByIp = rateLimit({
      windowMs: RATE_LIMIT_CONFIG.SIGNUP.SEND_OTP.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.SIGNUP.SEND_OTP.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.SIGNUP.SEND_OTP.PER_IP.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "signup:errors.rateLimitExceeded"
      )
    });

    this.signupOtpByEmail = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.SIGNUP.SEND_OTP.PER_EMAIL.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.SIGNUP.SEND_OTP.PER_EMAIL.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.SIGNUP.SEND_OTP.PER_EMAIL.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.body.email?.toLowerCase() || "unknown",
      handler: this.createRateLimitExceededHandler(
        "signup:errors.rateLimitExceeded"
      )
    });

    this.checkEmailByIp = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.SIGNUP.CHECK_EMAIL.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.SIGNUP.CHECK_EMAIL.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.SIGNUP.CHECK_EMAIL.PER_IP.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "signup:errors.rateLimitExceeded"
      )
    });

    this.loginOtpByIp = rateLimit({
      windowMs: RATE_LIMIT_CONFIG.LOGIN.OTP.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.LOGIN.OTP.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(RATE_LIMIT_CONFIG.LOGIN.OTP.PER_IP.KEY),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "login:errors.rateLimitExceeded"
      )
    });

    this.loginOtpByEmail = rateLimit({
      windowMs: RATE_LIMIT_CONFIG.LOGIN.OTP.PER_EMAIL.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.LOGIN.OTP.PER_EMAIL.MAX_REQUESTS,
      store: this.createRedisStore(RATE_LIMIT_CONFIG.LOGIN.OTP.PER_EMAIL.KEY),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.body.email?.toLowerCase() || "unknown",
      handler: this.createRateLimitExceededHandler(
        "login:errors.rateLimitExceeded"
      )
    });

    this.magicLinkByIp = rateLimit({
      windowMs: RATE_LIMIT_CONFIG.LOGIN.MAGIC_LINK.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.LOGIN.MAGIC_LINK.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.LOGIN.MAGIC_LINK.PER_IP.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "login:errors.rateLimitExceeded"
      )
    });

    this.magicLinkByEmail = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.LOGIN.MAGIC_LINK.PER_EMAIL.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.LOGIN.MAGIC_LINK.PER_EMAIL.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.LOGIN.MAGIC_LINK.PER_EMAIL.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.body.email?.toLowerCase() || "unknown",
      handler: this.createRateLimitExceededHandler(
        "login:errors.rateLimitExceeded"
      )
    });

    this.forgotPasswordOtpByIp = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.OTP.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.OTP.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.OTP.PER_IP.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "forgotPassword:errors.rateLimitExceeded"
      )
    });

    this.forgotPasswordOtpByEmail = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.OTP.PER_EMAIL.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.OTP.PER_EMAIL.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.OTP.PER_EMAIL.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.body.email?.toLowerCase() || "unknown",
      handler: this.createRateLimitExceededHandler(
        "forgotPassword:errors.rateLimitExceeded"
      )
    });

    this.forgotPasswordMagicLinkByIp = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAGIC_LINK.PER_IP.WINDOW_SECONDS *
        1000,
      max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAGIC_LINK.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAGIC_LINK.PER_IP.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "forgotPassword:errors.rateLimitExceeded"
      )
    });

    this.forgotPasswordMagicLinkByEmail = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAGIC_LINK.PER_EMAIL.WINDOW_SECONDS *
        1000,
      max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAGIC_LINK.PER_EMAIL.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAGIC_LINK.PER_EMAIL.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.body.email?.toLowerCase() || "unknown",
      handler: this.createRateLimitExceededHandler(
        "forgotPassword:errors.rateLimitExceeded"
      )
    });

    this.contactByIp = rateLimit({
      windowMs: RATE_LIMIT_CONFIG.CONTACT.SUBMIT.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.CONTACT.SUBMIT.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(RATE_LIMIT_CONFIG.CONTACT.SUBMIT.PER_IP.KEY),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "contactAdmin:errors.rateLimitExceeded"
      )
    });

    this.updateProfileByIp = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.USER.UPDATE_PROFILE.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.USER.UPDATE_PROFILE.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.USER.UPDATE_PROFILE.PER_IP.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "user:errors.rateLimitExceeded"
      )
    });

    this.forgotPasswordResetByIp = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.RESET.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.RESET.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.FORGOT_PASSWORD.RESET.PER_IP.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      handler: this.createRateLimitExceededHandler(
        "forgotPassword:errors.rateLimitExceeded"
      )
    });

    this.changePasswordByIpAndUser = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.CHANGE_PASSWORD.PER_IP_USER.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.CHANGE_PASSWORD.PER_IP_USER.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.CHANGE_PASSWORD.PER_IP_USER.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) =>
        `${req.ip ?? "unknown"}:${RequestContext.requireAuthId()}`,
      handler: this.createRateLimitExceededHandler(
        "changePassword:errors.rateLimitExceeded"
      )
    });

    this.categoriesByIp = rateLimit({
      windowMs: RATE_LIMIT_CONFIG.CATEGORIES.PER_IP.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.CATEGORIES.PER_IP.MAX_REQUESTS,
      store: this.createRedisStore(RATE_LIMIT_CONFIG.CATEGORIES.PER_IP.KEY),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.ip ?? "unknown",
      handler: this.createRateLimitExceededHandler(
        "webApp:errors.rateLimitExceeded"
      )
    });

    this.adminUserMutationByIpAndUser = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.USER.ADMIN_MUTATION.PER_IP_USER.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.USER.ADMIN_MUTATION.PER_IP_USER.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.USER.ADMIN_MUTATION.PER_IP_USER.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) =>
        `${req.ip ?? "unknown"}:${RequestContext.requireAuthId()}`,
      handler: this.createRateLimitExceededHandler(
        "user:errors.rateLimitExceeded"
      )
    });
  }

  private createRedisStore(prefix: string): RedisStore {
    return new RedisStore({
      sendCommand: (...args: string[]) => this.redisClient.sendCommand(args),
      prefix
    });
  }

  private createRateLimitExceededHandler(
    messageKey: I18n.Key
  ): RateLimitHandler {
    return (req: Request, res: Response): void => {
      const error = new TooManyRequestsError({
        i18nMessage: (t) => t(messageKey)
      });

      const body: ErrorPattern = {
        code: error.code,
        message: error.i18nMessage ? error.i18nMessage(req.t) : error.message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      };

      res.status(error.status).json(body);
    };
  }
}
