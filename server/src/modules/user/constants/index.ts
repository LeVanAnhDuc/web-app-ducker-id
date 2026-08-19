export const GENDERS = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
  PREFER_NOT_TO_SAY: "prefer_not_to_say"
} as const;

export const ADMIN_USER_STATUS_FILTERS = {
  ACTIVE: "active",
  LOCKED: "locked"
} as const;

export const ADMIN_USERS_SORT_BY = [
  "createdAt",
  "fullName",
  "lastLoginAt"
] as const;

export const USER_ADDRESS_CONFIG = {
  STREET_MAX_LENGTH: 200,
  CITY_MAX_LENGTH: 100,
  PROVINCE_MAX_LENGTH: 100,
  COUNTRY_MAX_LENGTH: 100,
  POSTAL_CODE_MAX_LENGTH: 20
} as const;
