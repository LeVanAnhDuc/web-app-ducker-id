// modules
import {
  CompleteSignupBodyDto,
  ResendOtpBodyDto,
  SendOtpBodyDto,
  VerifyOtpBodyDto
} from "@/modules/signup/dtos/requests";
// validators
// others
import { expectDto } from "@test/helpers/dto-cases";

const emailCases = {
  valid: { email: "user@example.com" },
  paddedUpperCase: { email: "  User@Example.COM  " },
  missing: {},
  null: { email: null },
  empty: { email: "" },
  wrongType: { email: 123 },
  notAnEmail: { email: "user" },
  unknownStripped: { email: "user@example.com", extra: "x" }
};

const VALID_COMPLETE = {
  email: "user@example.com",
  password: "Secret1!",
  confirmPassword: "Secret1!",
  sessionToken: "a".repeat(64),
  acceptTerms: true,
  fullName: "Nguyễn Văn A",
  gender: "male",
  dateOfBirth: "1995-05-15"
};

const complete = (overrides: Record<string, unknown>) => ({
  ...VALID_COMPLETE,
  ...overrides
});

const completeWithout = (field: keyof typeof VALID_COMPLETE) => {
  const body: Record<string, unknown> = { ...VALID_COMPLETE };
  delete body[field];
  return body;
};

describe("signup request DTOs match the Joi schemas", () => {
  it("SendOtpBodyDto ≡ sendOtpSchema", async () => {
    await expectDto(SendOtpBodyDto, emailCases);
  });

  it("ResendOtpBodyDto ≡ resendOtpSchema", async () => {
    await expectDto(ResendOtpBodyDto, emailCases);
  });

  it("VerifyOtpBodyDto ≡ verifyOtpSchema", async () => {
    const email = "user@example.com";
    await expectDto(VerifyOtpBodyDto, {
      valid: { email, otp: "123456" },
      emailMissing: { otp: "123456" },
      emailInvalid: { email: "user", otp: "123456" },
      otpMissing: { email },
      otpNull: { email, otp: null },
      otpEmpty: { email, otp: "" },
      otpWrongType: { email, otp: 123456 },
      otpTooShort: { email, otp: "12345" },
      otpTooLong: { email, otp: "1234567" },
      otpNotDigits: { email, otp: "12a456" },
      bothMissing: {}
    });
  });

  it("CompleteSignupBodyDto ≡ completeSignupSchema", async () => {
    await expectDto(CompleteSignupBodyDto, {
      valid: VALID_COMPLETE,
      validPaddedEmail: complete({ email: "  User@Example.COM " }),
      validDateOfBirthTimestamp: complete({ dateOfBirth: 800000000000 }),
      validDateOfBirthNumericString: complete({ dateOfBirth: "800000000000" }),
      validDateOfBirthIsoDateTime: complete({
        dateOfBirth: "1995-05-15T10:30:00.000Z"
      }),
      unknownStripped: complete({ role: "admin" }),
      empty: {},

      emailMissing: completeWithout("email"),
      emailInvalid: complete({ email: "user" }),

      passwordMissing: completeWithout("password"),
      passwordEmpty: complete({ password: "", confirmPassword: "" }),
      passwordWrongType: complete({ password: 12345678 }),
      passwordTooShort: complete({ password: "Se1!", confirmPassword: "Se1!" }),
      passwordTooLong: complete({
        password: `Secret1!${"a".repeat(121)}`,
        confirmPassword: `Secret1!${"a".repeat(121)}`
      }),
      passwordPatternBreak: complete({
        password: "secretpassword",
        confirmPassword: "secretpassword"
      }),

      confirmPasswordMissing: completeWithout("confirmPassword"),
      confirmPasswordNull: complete({ confirmPassword: null }),
      confirmPasswordEmpty: complete({ confirmPassword: "" }),
      confirmPasswordWrongType: complete({ confirmPassword: 123 }),
      confirmPasswordMismatch: complete({ confirmPassword: "Secret2!" }),

      sessionTokenMissing: completeWithout("sessionToken"),
      sessionTokenNull: complete({ sessionToken: null }),
      sessionTokenEmpty: complete({ sessionToken: "" }),
      sessionTokenWrongType: complete({ sessionToken: 123 }),
      sessionTokenTooShort: complete({ sessionToken: "a".repeat(63) }),
      sessionTokenTooLong: complete({ sessionToken: "a".repeat(65) }),

      acceptTermsMissing: completeWithout("acceptTerms"),
      acceptTermsNull: complete({ acceptTerms: null }),
      acceptTermsFalse: complete({ acceptTerms: false }),
      acceptTermsStringTrue: complete({ acceptTerms: "true" }),
      acceptTermsNumber: complete({ acceptTerms: 1 }),

      fullNameMissing: completeWithout("fullName"),
      fullNameEmpty: complete({ fullName: "" }),
      fullNameWrongType: complete({ fullName: 123 }),
      fullNameTooShort: complete({ fullName: "A" }),
      fullNameTooLong: complete({ fullName: "a".repeat(101) }),
      fullNamePatternBreak: complete({ fullName: "John3" }),

      genderMissing: completeWithout("gender"),
      genderEmpty: complete({ gender: "" }),
      genderWrongType: complete({ gender: 1 }),
      genderUnknown: complete({ gender: "unknown" }),

      dateOfBirthMissing: completeWithout("dateOfBirth"),
      dateOfBirthNull: complete({ dateOfBirth: null }),
      dateOfBirthEmpty: complete({ dateOfBirth: "" }),
      dateOfBirthWhitespace: complete({ dateOfBirth: "   " }),
      dateOfBirthNotADate: complete({ dateOfBirth: "not-a-date" }),
      dateOfBirthWrongType: complete({ dateOfBirth: true }),
      dateOfBirthTooYoung: complete({ dateOfBirth: "2025-01-01" }),
      dateOfBirthTooOld: complete({ dateOfBirth: "1900-01-01" })
    });
  });
});
