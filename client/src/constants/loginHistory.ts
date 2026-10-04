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

// Offered on the Home activity chart; the server validates the same set.
const STATS_RANGE = {
  WEEK: "7d",
  MONTH: "30d",
  QUARTER: "90d"
} as const;

const LOGIN_HISTORY = {
  METHOD,
  STATS_RANGE,
  SOURCE,
  APP_FILTER_IDP,
  STATUS,
  DEVICE_TYPE,
  LOCATION_SENTINEL,
  CLIENT_TYPE,
  METHOD_VALUES: Object.values(METHOD),
  STATUS_VALUES: Object.values(STATUS),
  DEVICE_TYPE_VALUES: Object.values(DEVICE_TYPE),
  STATS_RANGE_VALUES: Object.values(STATS_RANGE)
};

export default LOGIN_HISTORY;
