// modules
import {
  LoginBodyDto,
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto,
  OtpSendBodyDto,
  OtpVerifyBodyDto
} from "@/modules/login/dtos/requests";
// validators
// others
import { expectDto } from "@test/helpers/dto-cases";

const EMAIL = "user@example.com";
const TOKEN = "a1".repeat(64);

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

describe("login request DTOs match the Joi schemas", () => {
  it("LoginBodyDto ≡ loginSchema", async () => {
    await expectDto(LoginBodyDto, {
      valid: { email: EMAIL, password: "anything" },
      // Sign-in checks the stored hash only; the strength policy is not applied.
      weakPasswordAccepted: { email: EMAIL, password: "a" },
      paddedPasswordKept: { email: EMAIL, password: " secret " },
      unknownStripped: { email: EMAIL, password: "x", remember: true },
      emailMissing: { password: "x" },
      emailInvalid: { email: "not-an-email", password: "x" },
      emailWrongType: { email: 123, password: "x" },
      passwordMissing: { email: EMAIL },
      passwordNull: { email: EMAIL, password: null },
      passwordEmpty: { email: EMAIL, password: "" },
      passwordWrongType: { email: EMAIL, password: 123 },
      passwordOperator: { email: EMAIL, password: { $ne: "" } },
      // TC-OPS-008: both fields fail at once.
      emailInvalidPasswordMissing: { email: "not-an-email" },
      empty: {}
    });
  });

  it("OtpSendBodyDto ≡ otpSendSchema", async () => {
    await expectDto(OtpSendBodyDto, emailCases);
  });

  it("OtpVerifyBodyDto ≡ otpVerifySchema", async () => {
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

  it("MagicLinkSendBodyDto ≡ magicLinkSendSchema", async () => {
    await expectDto(MagicLinkSendBodyDto, emailCases);
  });

  it("MagicLinkVerifyBodyDto ≡ magicLinkVerifySchema", async () => {
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
      tokenShortAndNotHex: { email: EMAIL, token: "zz" },
      bothMissing: {}
    });
  });
});
