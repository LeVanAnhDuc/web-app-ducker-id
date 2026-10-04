// types
import type { Request, Response } from "express";
import type {
  AuthorizeOutcome,
  TokenRequestBody,
  TokenResponse,
  UserInfoResponse
} from "../types";
import type { OAuthServiceDeps } from "./deps";
// others
import { authorize } from "./authorize";
import { exchangeToken } from "./exchange-token";
import { getUserInfo } from "./get-user-info";
import { logout } from "./logout";

export class OAuthService {
  constructor(private readonly deps: OAuthServiceDeps) {}

  authorize(req: Request): Promise<AuthorizeOutcome> {
    return authorize(this.deps, req);
  }

  exchangeToken(
    body: TokenRequestBody,
    authorizationHeader?: string
  ): Promise<TokenResponse> {
    return exchangeToken(this.deps, body, authorizationHeader);
  }

  getUserInfo(
    authId: string,
    userId: string,
    scope: string
  ): Promise<UserInfoResponse> {
    return getUserInfo(this.deps, authId, userId, scope);
  }

  logout(req: Request, res: Response): Promise<string | null> {
    return logout(this.deps, req, res);
  }
}
