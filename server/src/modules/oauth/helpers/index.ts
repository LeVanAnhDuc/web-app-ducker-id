// libs
import crypto from "crypto";
// modules
import { OAUTH_SCOPE_CLAIMS } from "../constants";

/**
 * PKCE S256 (RFC 7636 §4.6): challenge = BASE64URL(SHA256(ASCII(verifier))).
 * So sánh bằng timingSafeEqual để không rò rỉ thông tin qua thời gian so sánh.
 */
export const verifyPkceChallenge = (
  verifier: string,
  challenge: string
): boolean => {
  const computed = crypto
    .createHash("sha256")
    .update(verifier, "ascii")
    .digest("base64url");

  const a = Buffer.from(computed);
  const b = Buffer.from(challenge);

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
};

/**
 * Khớp redirect_uri theo chuỗi chính xác (RFC 6749 §3.1.2.3 + BCP OAuth 2.0
 * Security). KHÔNG prefix match, KHÔNG wildcard, KHÔNG bỏ qua trailing slash —
 * với public client thì đây là cơ chế bảo mật chính, vì client_id là công khai
 * nên bất kỳ ai cũng khởi tạo được authorization request giả danh.
 */
export const matchRedirectUri = (
  registered: string[],
  candidate: string
): boolean => registered.includes(candidate);

/** Tách tham số `scope` (phân cách bằng khoảng trắng) thành mảng đã khử trùng. */
export const parseScopeParam = (raw?: string): string[] => {
  if (!raw) return [];
  return [...new Set(raw.split(/\s+/).filter(Boolean))];
};

/** Giao của scope được xin và scope app được phép — không tự nâng quyền. */
export const resolveGrantedScopes = (
  requested: string[],
  allowed: string[]
): string[] => requested.filter((scope) => allowed.includes(scope));

/**
 * Ghép query vào một URL đã có sẵn query. Bỏ qua giá trị undefined để không
 * sinh ra `state=undefined` khi client không gửi state.
 */
export const buildRedirectUrl = (
  base: string,
  params: Record<string, string | undefined>
): string => {
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, value);
  });

  return url.toString();
};

/** Lọc claim theo scope đã được cấp — dùng chung cho id_token và userinfo. */
export const filterClaimsByScopes = (
  claims: Record<string, unknown>,
  scopes: string[]
): Record<string, unknown> => {
  const allowed = new Set<string>();

  scopes.forEach((scope) => {
    (OAUTH_SCOPE_CLAIMS[scope] ?? []).forEach((claim) => allowed.add(claim));
  });

  return Object.fromEntries(
    Object.entries(claims).filter(([key]) => allowed.has(key))
  );
};

/**
 * Validate redirect_uri lúc ĐĂNG KÝ app. Bắt buộc https trừ khi host là
 * localhost (để dev được), không fragment (RFC 6749 §3.1.2 cấm), không
 * wildcard.
 */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export const isValidRedirectUri = (value: string): boolean => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.hash) return false;
  if (value.includes("*")) return false;

  const isLocal = LOCAL_HOSTS.includes(url.hostname);

  if (url.protocol === "https:") return true;
  if (url.protocol === "http:" && isLocal) return true;

  return false;
};
