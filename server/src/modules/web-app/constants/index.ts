export const WEB_APP_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE"
} as const;

export const OAUTH_GRANT_TYPES = {
  AUTHORIZATION_CODE: "authorization_code",
  REFRESH_TOKEN: "refresh_token",
  CLIENT_CREDENTIALS: "client_credentials"
} as const;

export const OAUTH_RESPONSE_TYPES = {
  CODE: "code"
} as const;

export const TOKEN_ENDPOINT_AUTH_METHODS = {
  CLIENT_SECRET_BASIC: "client_secret_basic",
  NONE: "none"
} as const;

export const WEB_APP_CONFIG = {
  NAME_MAX_LENGTH: 100,
  DISPLAY_NAME_MAX_LENGTH: 150,
  DESCRIPTION_MAX_LENGTH: 1000,
  URL_MAX_LENGTH: 2048,
  CLIENT_ID_MAX_LENGTH: 100,
  CLIENT_SECRET_HASH_MAX_LENGTH: 255,
  MAX_REDIRECT_URIS: 20,
  MAX_POST_LOGOUT_REDIRECT_URIS: 20,
  MAX_GRANT_TYPES: 10,
  MAX_RESPONSE_TYPES: 10,
  MAX_SCOPES: 50,
  MAX_REQUIRED_ROLES: 10,
  DEFAULT_GRANT_TYPES: ["authorization_code", "refresh_token"] as string[],
  DEFAULT_RESPONSE_TYPES: ["code"] as string[]
} as const;

export const WEB_APP_CATEGORY_CONFIG = {
  NAME_MAX_LENGTH: 100,
  DISPLAY_NAME_MAX_LENGTH: 150,
  ICON_MAX_LENGTH: 500
} as const;

export const WEB_APP_STATUS_PUBLIC = {
  ACTIVE: "active",
  INACTIVE: "inactive"
} as const;

export const WEB_APP_DEFAULT_SCOPES = ["openid", "profile", "email"] as const;

export const CLIENT_CREDENTIALS_CONFIG = {
  CLIENT_ID_PREFIX: "client_",
  CLIENT_ID_RANDOM_BYTES: 6,
  CLIENT_SECRET_RANDOM_BYTES: 32
} as const;
