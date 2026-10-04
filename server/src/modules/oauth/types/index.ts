// types
import type { Request } from "express";

/** Tham số của một authorization request, sau khi đã validate. */
export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scopes: string[];
  state?: string;
  nonce?: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  prompt?: string;
}

/** Bản ghi authorization code trên Redis. Đọc bằng GETDEL nên dùng đúng 1 lần. */
export interface AuthorizationCodeRecord {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  nonce?: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  sub: string;
  authId: string;
  sid: string;
  authTime: number;
}

/**
 * Authorize request đang chờ user đăng nhập. Cất nguyên tham số ở server rồi
 * chỉ đưa cho trình duyệt một khoá tra cứu — user không sửa được redirect_uri
 * hay scope giữa chừng, và URL trang login vẫn sạch.
 */
export type PendingAuthorizeRequest = AuthorizeParams;

export interface TokenRequestBody {
  grant_type?: string;
  code?: string;
  code_verifier?: string;
  redirect_uri?: string;
  client_id?: string;
  client_secret?: string;
}

export interface TokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface UserInfoResponse {
  sub: string;
  name?: string;
  picture?: string | null;
  email?: string;
  email_verified?: boolean;
}

export type AuthorizeRequest = Request<
  Record<string, never>,
  unknown,
  unknown,
  Record<string, string | undefined>
>;

export type TokenRequest = Request<
  Record<string, never>,
  unknown,
  TokenRequestBody
>;
