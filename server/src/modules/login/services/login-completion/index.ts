// types
import type { Request } from "express";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { UserDocument } from "@/modules/user/types";
import type { LoginMethod } from "@/modules/login-history/types";
import type { LoginResponseDto } from "../../dtos";
import type { LoginAuditService } from "../login-audit";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
// dtos
import { toLoginResponseDto } from "../../dtos";
// others
import { RequestContext } from "@/utils/request-context";

export class LoginCompletionService {
  constructor(private readonly audit: LoginAuditService) {}

  complete(params: {
    auth: AuthenticationDocument;
    user: UserDocument;
    method: LoginMethod;
    req: Request;
  }): LoginResponseDto {
    const { auth, user, method, req } = params;

    this.audit.recordSuccess({ auth, user, method, req });

    // Đặt danh tính vào RequestContext để LoginController mở được phiên IdP
    // (cookie `sid`) mà không phải đổi chữ ký của cả ba login strategy.
    RequestContext.setUser({
      sub: user._id.toString(),
      authId: auth._id.toString(),
      roles: auth.roles
    });

    return toLoginResponseDto(
      generateAuthTokensResponse({
        userId: user._id.toString(),
        authId: auth._id.toString(),
        email: user.email,
        roles: auth.roles,
        fullName: user.fullName,
        avatar: user.avatar ?? null,
        tokenVersion: auth.tokenVersion ?? 0,
        mustChangePassword: auth.mustChangePassword ?? false
      })
    );
  }
}
