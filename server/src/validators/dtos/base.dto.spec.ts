// validators
import {
  IsAppEmail,
  IsAppPassword,
  IsFullName,
  IsGender,
  IsOtp
} from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";
// others
import { expectDto } from "@test/helpers/dto-cases";

// Invisible in source, so spelled out: SAFE_EMAIL_PATTERN refuses it.
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

class EmailDto {
  @IsAppEmail()
  v!: string;
}

class PasswordDto {
  @IsAppPassword()
  v!: string;
}

class OtpDto {
  @IsOtp()
  v!: string;
}

class FullNameDto {
  @IsFullName()
  v!: string;
}

class GenderDto {
  @IsGender()
  v!: string;
}

const commonCases = {
  missing: {},
  null: { v: null },
  empty: { v: "" },
  wrongType: { v: 123 },
  object: { v: { $ne: "" } }
};

describe("shared field decorators match the Joi fragments", () => {
  it("IsAppEmail ≡ emailSchema", async () => {
    await expectDto(EmailDto, {
      ...commonCases,
      valid: { v: "user@example.com" },
      paddedUpperCase: { v: "  User@Example.COM  " },
      whitespaceOnly: { v: "   " },
      notAnEmail: { v: "user" },
      tooShort: { v: "a@" },
      tooLongLocalPart: { v: `${"a".repeat(250)}@example.com` },
      // Over 254 characters: both email checks refuse it before the length
      // rule, so `maxLength` is unreachable in either validator.
      tooLong: { v: `${"a".repeat(64)}@${`${"b".repeat(62)}.`.repeat(3)}com` },
      controlCharacter: { v: `us${ZERO_WIDTH_SPACE}er@example.com` },
      reservedTldLocal: { v: "user@test.local" },
      reservedTldInvalid: { v: "user@example.invalid" },
      unknownTld: { v: "a@b.xyzzy" },
      singleLabelDomain: { v: "user@localhost" },
      unicodeDomain: { v: "user@bücher.de" },
      unicodeDomainUnknownTld: { v: "user@例え.テスト" }
    });
  });

  it("IsAppPassword ≡ passwordSchema", async () => {
    await expectDto(PasswordDto, {
      ...commonCases,
      valid: { v: "Secret1!" },
      tooShort: { v: "Se1!" },
      tooLong: { v: `Secret1!${"a".repeat(121)}` },
      patternBreak: { v: "secretpassword" },
      paddedNotTrimmed: { v: " Secret1! " }
    });
  });

  it("IsOtp ≡ otpSchema", async () => {
    await expectDto(OtpDto, {
      ...commonCases,
      valid: { v: "123456" },
      tooShort: { v: "12345" },
      tooLong: { v: "1234567" },
      patternBreak: { v: "12a456" },
      shortAndNonNumeric: { v: "12a" }
    });
  });

  it("IsFullName ≡ fullNameSchema", async () => {
    await expectDto(FullNameDto, {
      ...commonCases,
      valid: { v: "Nguyễn Văn A" },
      tooShort: { v: "A" },
      tooLong: { v: "a".repeat(101) },
      patternBreak: { v: "<script>" },
      shortAndPatternBreak: { v: "1" }
    });
  });

  it("IsGender ≡ genderSchema", async () => {
    await expectDto(GenderDto, {
      ...commonCases,
      valid: { v: "male" },
      unknownValue: { v: "robot" },
      upperCase: { v: "MALE" }
    });
  });
});

describe("PaginationQueryDto matches the repeated Joi pagination keys", () => {
  it("PaginationQueryDto ≡ page / limit / sortOrder", async () => {
    await expectDto(PaginationQueryDto, {
      none: {},
      valid: { page: "2", limit: "50", sortOrder: "asc" },
      numbers: { page: 3, limit: 10 },
      unknownStripped: { page: "1", other: "x" },
      pageZero: { page: "0" },
      pageNegative: { page: "-1" },
      pageDecimal: { page: "1.5" },
      pageText: { page: "abc" },
      pageEmpty: { page: "" },
      pageBlank: { page: "   " },
      pagePlusSign: { page: "+2" },
      pagePadded: { page: " 2" },
      pageTrailingZero: { page: "2.0" },
      pageExponent: { page: "1e2" },
      pageLeadingZero: { page: "02" },
      pageUnsafe: { page: "99999999999999999999" },
      limitPadded: { limit: " 50 " },
      limitExponent: { limit: "1e1" },
      limitUnsafe: { limit: "99999999999999999999" },
      limitZero: { limit: "0" },
      limitAtMax: { limit: "100" },
      limitOverMax: { limit: "101" },
      limitText: { limit: "ten" },
      sortOrderUnknown: { sortOrder: "up" },
      sortOrderEmpty: { sortOrder: "" },
      sortOrderArray: { sortOrder: ["asc"] }
    });
  });
});
