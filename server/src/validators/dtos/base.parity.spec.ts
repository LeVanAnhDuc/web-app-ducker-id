// libs
import Joi from "joi";
// types
import type { Schema } from "joi";
// validators
import {
  IsAppEmail,
  IsAppPassword,
  IsFullName,
  IsGender,
  IsOtp
} from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";
import {
  emailSchema,
  fullNameSchema,
  genderSchema,
  otpSchema,
  passwordSchema
} from "@/validators/schemas/base";
import { notificationListQuerySchema } from "@/validators/schemas/notification";
// others
import { expectParity } from "@test/helpers/validation-parity";

// Invisible in source, so spelled out: SAFE_EMAIL_PATTERN refuses it.
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

const field = (schema: Schema) => Joi.object({ v: schema.required() });

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
    await expectParity(field(emailSchema), EmailDto, {
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
      controlCharacter: { v: `us${ZERO_WIDTH_SPACE}er@example.com` }
    });
  });

  it("IsAppPassword ≡ passwordSchema", async () => {
    await expectParity(field(passwordSchema), PasswordDto, {
      ...commonCases,
      valid: { v: "Secret1!" },
      tooShort: { v: "Se1!" },
      tooLong: { v: `Secret1!${"a".repeat(121)}` },
      patternBreak: { v: "secretpassword" },
      paddedNotTrimmed: { v: " Secret1! " }
    });
  });

  it("IsOtp ≡ otpSchema", async () => {
    await expectParity(field(otpSchema), OtpDto, {
      ...commonCases,
      valid: { v: "123456" },
      tooShort: { v: "12345" },
      tooLong: { v: "1234567" },
      patternBreak: { v: "12a456" },
      shortAndNonNumeric: { v: "12a" }
    });
  });

  it("IsFullName ≡ fullNameSchema", async () => {
    await expectParity(field(fullNameSchema), FullNameDto, {
      ...commonCases,
      valid: { v: "Nguyễn Văn A" },
      tooShort: { v: "A" },
      tooLong: { v: "a".repeat(101) },
      patternBreak: { v: "<script>" },
      shortAndPatternBreak: { v: "1" }
    });
  });

  it("IsGender ≡ genderSchema", async () => {
    await expectParity(field(genderSchema), GenderDto, {
      ...commonCases,
      valid: { v: "male" },
      unknownValue: { v: "robot" },
      upperCase: { v: "MALE" }
    });
  });
});

describe("PaginationQueryDto matches the repeated Joi pagination keys", () => {
  const pagination = Joi.object({
    page: notificationListQuerySchema.extract("page"),
    limit: notificationListQuerySchema.extract("limit"),
    sortOrder: notificationListQuerySchema.extract("sortOrder")
  });

  it("PaginationQueryDto ≡ page / limit / sortOrder", async () => {
    await expectParity(pagination, PaginationQueryDto, {
      none: {},
      valid: { page: "2", limit: "50", sortOrder: "asc" },
      numbers: { page: 3, limit: 10 },
      unknownStripped: { page: "1", other: "x" },
      pageZero: { page: "0" },
      pageNegative: { page: "-1" },
      pageDecimal: { page: "1.5" },
      pageText: { page: "abc" },
      pageEmpty: { page: "" },
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
