// modules
import {
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto,
  OtpSendBodyDto,
  OtpVerifyBodyDto,
  ResetPasswordBodyDto
} from "@/modules/forgot-password/dtos/requests";
// validators
// others
import { expectDto } from "@test/helpers/dto-cases";

const EMAIL = "user@example.com";
const TOKEN = "a1".repeat(64);
const PASSWORD = "Secret1!";

const emailCases = {
  valid: { email: EMAIL },
  paddedUpperCase: { email: "  User@Example.COM  " },
  missing: {},
  null: { email: null },
  empty: { email: "" },
  wrongType: { email: 123 },
  notAnEmail: { email: "user" },
  unknownStripped: { email: EMAIL, extra: "x" }
};

describe("forgot-password request DTOs match the Joi schemas", () => {
  it("OtpSendBodyDto ≡ fpOtpSendSchema", async () => {
    await expectDto(OtpSendBodyDto, emailCases);
  });

  it("OtpVerifyBodyDto ≡ fpOtpVerifySchema", async () => {
    await expectDto(OtpVerifyBodyDto, {
      valid: { email: EMAIL, otp: "123456" },
      emailMissing: { otp: "123456" },
      emailInvalid: { email: "user", otp: "123456" },
      otpMissing: { email: EMAIL },
      otpNull: { email: EMAIL, otp: null },
      otpEmpty: { email: EMAIL, otp: "" },
      otpWrongType: { email: EMAIL, otp: 123456 },
      otpTooShort: { email: EMAIL, otp: "12345" },
      otpTooLong: { email: EMAIL, otp: "1234567" },
      otpNotDigits: { email: EMAIL, otp: "12a456" },
      bothMissing: {}
    });
  });

  it("MagicLinkSendBodyDto ≡ fpMagicLinkSendSchema", async () => {
    await expectDto(MagicLinkSendBodyDto, emailCases);
  });

  it("MagicLinkVerifyBodyDto ≡ fpMagicLinkVerifySchema", async () => {
    await expectDto(MagicLinkVerifyBodyDto, {
      valid: { email: EMAIL, token: TOKEN },
      unknownStripped: { email: EMAIL, token: TOKEN, extra: 1 },
      emailMissing: { token: TOKEN },
      emailInvalid: { email: "user", token: TOKEN },
      tokenMissing: { email: EMAIL },
      tokenNull: { email: EMAIL, token: null },
      tokenEmpty: { email: EMAIL, token: "" },
      tokenWrongType: { email: EMAIL, token: 123 },
      tokenTooShort: { email: EMAIL, token: TOKEN.slice(1) },
      tokenTooLong: { email: EMAIL, token: `${TOKEN}a` },
      tokenUpperCase: { email: EMAIL, token: TOKEN.toUpperCase() },
      tokenNotHex: { email: EMAIL, token: "z".repeat(128) },
      bothMissing: {}
    });
  });

  it("ResetPasswordBodyDto ≡ fpResetPasswordSchema", async () => {
    const valid = { email: EMAIL, resetToken: TOKEN, newPassword: PASSWORD };
    await expectDto(ResetPasswordBodyDto, {
      valid,
      unknownStripped: { ...valid, confirmPassword: PASSWORD },
      empty: {},
      emailMissing: { resetToken: TOKEN, newPassword: PASSWORD },
      emailInvalid: { ...valid, email: "user" },
      resetTokenMissing: { email: EMAIL, newPassword: PASSWORD },
      resetTokenNull: { ...valid, resetToken: null },
      resetTokenEmpty: { ...valid, resetToken: "" },
      resetTokenWrongType: { ...valid, resetToken: 123 },
      resetTokenTooShort: { ...valid, resetToken: TOKEN.slice(1) },
      resetTokenTooLong: { ...valid, resetToken: `${TOKEN}a` },
      resetTokenUpperCase: { ...valid, resetToken: TOKEN.toUpperCase() },
      newPasswordMissing: { email: EMAIL, resetToken: TOKEN },
      newPasswordNull: { ...valid, newPassword: null },
      newPasswordEmpty: { ...valid, newPassword: "" },
      newPasswordWrongType: { ...valid, newPassword: 12345678 },
      newPasswordTooShort: { ...valid, newPassword: "Se1!" },
      newPasswordTooLong: {
        ...valid,
        newPassword: `${PASSWORD}${"a".repeat(121)}`
      },
      newPasswordPatternBreak: { ...valid, newPassword: "secretpassword" }
    });
  });
});
