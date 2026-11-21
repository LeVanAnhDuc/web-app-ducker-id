// libs
import { StatusCodes } from "http-status-codes";
// types
import type { RequestHandler } from "express";
import type {
  RateLimitName,
  RateLimiters
} from "@/middlewares/common/rate-limiter.middleware";
// common
import { RATE_LIMITS } from "@/middlewares/common/rate-limiter.middleware";
import { adminGuard } from "@/middlewares/guards/admin.guard";
import { authGuard } from "@/middlewares/guards/auth.guard";
// others
import {
  Admin,
  Auth,
  OptionalAuth,
  PasswordChangeAuth,
  RateLimit,
  Respond,
  ValidBody,
  ValidParams,
  ValidQuery
} from "../decorators";
import { readRouteMeta } from "../metadata";
import { orderMiddlewares } from "../order";

class X {}
class P {}
class B {}
class Q {}

// A fake handler per limiter, so the spec needs no Redis.
const rl = Object.fromEntries(
  Object.keys(RATE_LIMITS).map((name) => {
    const handler: RequestHandler = (_req, _res, next) => next();
    return [name, handler];
  })
) as unknown as RateLimiters;

const labelsOf = (Ctor: abstract new () => object, method: string) =>
  orderMiddlewares(readRouteMeta(Ctor, method), rl).labels;

class ProfileController {
  @Auth()
  @RateLimit("updateProfileByIp")
  update(@ValidBody(X) _body: X) {}
}

@Auth()
@Admin()
class CategoryAdminController {
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({ message: "category:success.update" })
  update(@ValidParams(P) _params: P, @ValidBody(B) _body: B) {}
}

class PublicCategoryController {
  @OptionalAuth()
  @RateLimit("categoriesByIp")
  listPublic() {}
}

class ChangePasswordController {
  @RateLimit("changePasswordByIpAndUser")
  @PasswordChangeAuth()
  changePassword(@ValidBody(B) _body: B) {}
}

class ReadingOrderA {
  @Auth()
  @Admin()
  @RateLimit("forgotPasswordOtpByIp", "forgotPasswordOtpByEmail")
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({ status: StatusCodes.CREATED })
  act(@ValidBody(B) _b: B, @ValidQuery(Q) _q: Q, @ValidParams(P) _p: P) {}
}

class ReadingOrderB {
  @Respond({ status: StatusCodes.CREATED })
  @RateLimit("adminUserMutationByIpAndUser")
  @RateLimit("forgotPasswordOtpByIp", "forgotPasswordOtpByEmail")
  @Admin()
  @Auth()
  act(@ValidParams(P) _p: P, @ValidQuery(Q) _q: Q, @ValidBody(B) _b: B) {}
}

describe("orderMiddlewares", () => {
  it("runs an IP limiter before the guard", () => {
    expect(labelsOf(ProfileController, "update")).toEqual([
      "rl:updateProfileByIp",
      "auth",
      "body:X"
    ]);
  });

  it("runs class guards, then a user-keyed limiter, then params before body", () => {
    expect(labelsOf(CategoryAdminController, "update")).toEqual([
      "auth",
      "admin",
      "rl:categoryMutationByIpAndUser",
      "params:P",
      "body:B"
    ]);
  });

  it("runs an IP limiter before the optional guard", () => {
    expect(labelsOf(PublicCategoryController, "listPublic")).toEqual([
      "rl:categoriesByIp",
      "optionalAuth"
    ]);
  });

  it("runs the password-change guard before its user-keyed limiter", () => {
    expect(labelsOf(ChangePasswordController, "changePassword")).toEqual([
      "passwordChangeAuth",
      "rl:changePasswordByIpAndUser",
      "body:B"
    ]);
  });

  it("does not depend on the order the decorators are written in", () => {
    const expected = [
      "rl:forgotPasswordOtpByIp",
      "rl:forgotPasswordOtpByEmail",
      "auth",
      "admin",
      "rl:adminUserMutationByIpAndUser",
      "params:P",
      "query:Q",
      "body:B"
    ];

    expect(labelsOf(ReadingOrderA, "act")).toEqual(expected);
    expect(labelsOf(ReadingOrderB, "act")).toEqual(expected);
  });

  it("emits one handler per label plus the first one that records the response options", () => {
    const { handlers, labels } = orderMiddlewares(
      readRouteMeta(CategoryAdminController, "update"),
      rl
    );

    expect(handlers).toHaveLength(labels.length + 1);
    expect(handlers.slice(1, 4)).toEqual([
      authGuard,
      adminGuard,
      rl.categoryMutationByIpAndUser
    ]);
  });

  it("refuses a user-keyed limiter on a route with no guard", () => {
    class Unguarded {
      @RateLimit("recordRecentAppByUser" satisfies RateLimitName)
      record() {}
    }

    expect(() =>
      orderMiddlewares(readRouteMeta(Unguarded, "record"), rl)
    ).toThrow(/Unguarded\.record.*recordRecentAppByUser/);
  });

  it("refuses a user-keyed limiter behind the optional guard only", () => {
    class OptionalOnly {
      @OptionalAuth()
      @RateLimit("categoryMutationByIpAndUser")
      act() {}
    }

    expect(() =>
      orderMiddlewares(readRouteMeta(OptionalOnly, "act"), rl)
    ).toThrow(/OptionalOnly\.act/);
  });
});
