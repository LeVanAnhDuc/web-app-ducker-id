// libs
import crypto from "crypto";
// others
import ENV from "@/constants/env";
import { Logger } from "@/libs/logger";

/**
 * Khoá ký bất đối xứng cho OIDC.
 *
 * App vệ tinh verify id_token/access_token bằng public key lấy từ
 * /.well-known/jwks.json — nên chúng KHÔNG được giữ private key. Đây là lý do
 * access_token và id_token chuyển từ HS256 (secret dùng chung) sang RS256.
 * Refresh token vẫn HS256 vì nó không bao giờ rời khỏi Ducker ID.
 *
 * Production: bắt buộc cấp OAUTH_PRIVATE_KEY + OAUTH_PUBLIC_KEY (PEM) và
 * OAUTH_KEY_ID. Dev: nếu thiếu thì sinh keypair tạm lúc boot — tiện khi chạy
 * local, nhưng restart là mọi token cũ hết hiệu lực.
 */

export interface PublicJwk {
  kty: string;
  n: string;
  e: string;
  kid: string;
  use: "sig";
  alg: "RS256";
}

export const SIGNING_ALGORITHM = "RS256" as const;

const RSA_MODULUS_LENGTH = 2048;

// PEM trong biến môi trường thường bị escape thành "\n" hai ký tự.
const normalizePem = (raw: string): string => raw.replace(/\\n/g, "\n").trim();

interface KeyMaterial {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  keyId: string;
}

let cached: KeyMaterial | null = null;

const deriveKeyId = (publicKey: crypto.KeyObject): string => {
  const der = publicKey.export({ type: "spki", format: "der" });
  return crypto
    .createHash("sha256")
    .update(der)
    .digest("base64url")
    .slice(0, 16);
};

const loadFromEnv = (): KeyMaterial | null => {
  const { OAUTH_PRIVATE_KEY, OAUTH_PUBLIC_KEY, OAUTH_KEY_ID } = ENV;

  if (!OAUTH_PRIVATE_KEY || !OAUTH_PUBLIC_KEY) return null;

  const privateKey = crypto.createPrivateKey(normalizePem(OAUTH_PRIVATE_KEY));
  const publicKey = crypto.createPublicKey(normalizePem(OAUTH_PUBLIC_KEY));

  return {
    privateKey,
    publicKey,
    keyId: OAUTH_KEY_ID || deriveKeyId(publicKey)
  };
};

const generateEphemeral = (): KeyMaterial => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: RSA_MODULUS_LENGTH
  });

  Logger.warn(
    "OAUTH_PRIVATE_KEY/OAUTH_PUBLIC_KEY chưa được cấu hình — đã sinh keypair tạm cho phiên chạy này. Mọi token do phiên trước phát ra sẽ không verify được."
  );

  return { privateKey, publicKey, keyId: deriveKeyId(publicKey) };
};

const getKeyMaterial = (): KeyMaterial => {
  if (cached) return cached;

  const fromEnv = loadFromEnv();

  if (!fromEnv && ENV.NODE_ENV === "production") {
    throw new Error(
      "OAUTH_PRIVATE_KEY và OAUTH_PUBLIC_KEY là bắt buộc ở production — không thể dùng keypair tạm."
    );
  }

  cached = fromEnv ?? generateEphemeral();
  return cached;
};

export const getSigningKey = (): crypto.KeyObject =>
  getKeyMaterial().privateKey;

export const getVerificationKey = (): crypto.KeyObject =>
  getKeyMaterial().publicKey;

export const getKeyId = (): string => getKeyMaterial().keyId;

/** Public key ở dạng JWK để phục vụ /.well-known/jwks.json */
export const getPublicJwk = (): PublicJwk => {
  const { publicKey, keyId } = getKeyMaterial();
  const jwk = publicKey.export({ format: "jwk" }) as {
    kty: string;
    n: string;
    e: string;
  };

  return {
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e,
    kid: keyId,
    use: "sig",
    alg: SIGNING_ALGORITHM
  };
};

/** Nạp sẵn khoá lúc boot để lỗi cấu hình nổ ngay thay vì ở request đầu tiên. */
export const initSigningKeys = (): void => {
  const { keyId } = getKeyMaterial();
  Logger.info("OIDC signing key ready", { kid: keyId, alg: SIGNING_ALGORITHM });
};
