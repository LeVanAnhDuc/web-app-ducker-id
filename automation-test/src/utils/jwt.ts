import crypto from "node:crypto";

/** Decodes a JWT payload without verifying it. */
export function jwtPayload<T = Record<string, unknown>>(jwt: string): T {
  const part = jwt.split(".")[1];
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

/**
 * A syntactically valid but UNSIGNED JWT carrying `payload` (header
 * `alg: none`, signature "fake-signature"). The client only base64url-decodes
 * tokens (jwt-decode, isTokenExpired) and never verifies them, so a faked
 * session drives claim-based UI such as `mustChangePassword`. The real server
 * always verifies signatures and refuses these.
 */
export function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.fake-signature`;
}

/** Decodes a JWT header (alg, kid, typ…) without verifying the token. */
export function jwtHeader<T = Record<string, unknown>>(jwt: string): T {
  const part = jwt.split(".")[0];
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

/** One public key of a JWKS (RFC 7517) — the RSA members the server publishes. */
export interface Jwk {
  kty: string;
  n: string;
  e: string;
  kid: string;
  use?: string;
  alg?: string;
}

/** RS256 signature check of a compact JWS against one JWK (node:crypto only). */
export function verifyRs256(token: string, jwk: Jwk): boolean {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return false;
  const key = crypto.createPublicKey({
    key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
    format: "jwk"
  });
  return crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${h}.${p}`),
    key,
    Buffer.from(s, "base64url")
  );
}

/** Flips one character of the signature so the JWS no longer verifies. */
export function tamperSignature(token: string): string {
  const [h, p, s] = token.split(".");
  const flipped = s[5] === "A" ? "B" : "A";
  return `${h}.${p}.${s.slice(0, 5)}${flipped}${s.slice(6)}`;
}

/**
 * The same JWT with `claims` merged into its payload — header and signature
 * kept as they were, so the result no longer verifies. Models a holder who
 * edits their own token (e.g. `roles: "admin"`) without the signing key.
 */
export function withClaims(
  token: string,
  claims: Record<string, unknown>
): string {
  const [h, p, s] = token.split(".");
  const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  const edited = Buffer.from(
    JSON.stringify({ ...payload, ...claims })
  ).toString("base64url");
  return `${h}.${edited}.${s}`;
}
