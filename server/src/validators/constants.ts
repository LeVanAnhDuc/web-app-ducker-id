export const EMAIL_VALIDATION = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 254
} as const;

export const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SAFE_EMAIL_PATTERN =
  // eslint-disable-next-line no-control-regex
  /^[^\u0000-\u001F\u007F-\u009F\u200B-\u200D\u202A-\u202E\uFEFF]+$/;

export const PASSWORD_VALIDATION = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128
} as const;

export const PASSWORD_STRENGTH_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

export const OTP_VALIDATION = {
  LENGTH: 6
} as const;

export const NUMERIC_OTP_PATTERN = /^\d+$/;

export const FULLNAME_VALIDATION = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 100
} as const;

export const SAFE_FULLNAME_PATTERN = /^[\p{L}\s\-'.]+$/u;

export const AGE_VALIDATION = {
  MIN_AGE: 13,
  MAX_AGE: 120
} as const;

export const SAFE_ADDRESS_PATTERN = /^[\p{L}\p{N}\s,.\-'/#]+$/u;

export const CONTACT_CONFIG = {
  SUBJECT_MIN_LENGTH: 5,
  SUBJECT_MAX_LENGTH: 200,
  MESSAGE_MIN_LENGTH: 20,
  MESSAGE_MAX_LENGTH: 5000
} as const;

export const OBJECTID_PATTERN = /^[a-fA-F0-9]{24}$/;

export const SEARCH_MAX_LENGTH = 200;
