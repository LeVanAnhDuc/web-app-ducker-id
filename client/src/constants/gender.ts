const GENDER = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
  PREFER_NOT_TO_SAY: "prefer_not_to_say"
} as const;

export const GENDER_VALUES = [
  GENDER.MALE,
  GENDER.FEMALE,
  GENDER.OTHER,
  GENDER.PREFER_NOT_TO_SAY
] as const;

export default GENDER;
