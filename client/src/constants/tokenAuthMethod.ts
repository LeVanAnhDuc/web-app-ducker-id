/**
 * Cách app vệ tinh tự xác thực ở /oauth/token.
 *
 * NONE = public client (SPA tĩnh, mobile): không có client_secret, vì không có
 * chỗ nào trong trình duyệt giữ được bí mật. PKCE gánh vai trò bảo vệ code.
 */
const TOKEN_AUTH_METHOD = {
  CLIENT_SECRET_BASIC: "client_secret_basic",
  NONE: "none"
} as const;

export default TOKEN_AUTH_METHOD;
