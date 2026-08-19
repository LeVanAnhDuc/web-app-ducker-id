const METHOD = {
  PASSWORD: "password",
  OTP: "otp",
  MAGIC_LINK: "magic-link",
  FORGOT_PASSWORD: "forgot-password"
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
  STATUS,
  DEVICE_TYPE,
  LOCATION_SENTINEL,
  CLIENT_TYPE,
  METHOD_VALUES: Object.values(METHOD),
  STATUS_VALUES: Object.values(STATUS)
};

export default LOGIN_HISTORY;
