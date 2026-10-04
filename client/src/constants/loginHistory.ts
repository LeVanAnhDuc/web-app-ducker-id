const METHOD = {
  PASSWORD: "password",
  OTP: "otp",
  MAGIC_LINK: "magic-link",
  FORGOT_PASSWORD: "forgot-password",
  SSO: "sso"
} as const;

const SOURCE = {
  IDP: "idp",
  OAUTH: "oauth"
} as const;

// Values of the "app" filter: "idp" or a web-app id.
const APP_FILTER_IDP = SOURCE.IDP;

// Values of the "signIn" filter. The user page treats "no value" as
// interactive-only; the admin page treats it as everything.
const SIGN_IN_FILTER = {
  ALL: "all",
  INTERACTIVE: "interactive",
  SILENT: "silent"
} as const;

const STATUS = {
  SUCCESS: "success",
  FAILED: "failed"
} as const;

const DEVICE_TYPE = {
  DESKTOP: "DESKTOP",
  MOBILE: "MOBILE",
  TABLET: "TABLET",
  UNKNOWN: "UNKNOWN"
} as const;

const LOCATION_SENTINEL = {
  UNKNOWN: "UNKNOWN",
  LOCAL: "LOCAL"
} as const;

const CLIENT_TYPE = {
  WEB: "WEB",
  MOBILE_IOS: "MOBILE_IOS",
  MOBILE_ANDROID: "MOBILE_ANDROID"
} as const;

const LOGIN_HISTORY = {
  METHOD,
  SOURCE,
  APP_FILTER_IDP,
  SIGN_IN_FILTER,
  STATUS,
  DEVICE_TYPE,
  LOCATION_SENTINEL,
  CLIENT_TYPE,
  METHOD_VALUES: Object.values(METHOD),
  STATUS_VALUES: Object.values(STATUS)
};

export default LOGIN_HISTORY;
