const ADMIN_APP_FIELD_NAMES = {
  NAME: "name",
  DISPLAY_NAME: "displayName",
  DESCRIPTION: "description",
  ICON_URL: "iconUrl",
  HOME_URL: "homeUrl",
  CATEGORY_IDS: "categoryIds",
  STATUS: "status",
  REQUIRED_ROLES: "requiredRoles",
  REDIRECT_URIS: "redirectUris",
  TOKEN_ENDPOINT_AUTH_METHOD: "tokenEndpointAuthMethod"
} as const;

export default ADMIN_APP_FIELD_NAMES;
