// modules
import {
  UnlockRequestBodyDto,
  UnlockVerifyBodyDto
} from "@/modules/unlock-account/dtos/requests";
// validators
// others
import { expectDto } from "@test/helpers/dto-cases";

const EMAIL = "user@example.com";
const TEMP_PASSWORD = "a".repeat(12);

describe("unlock-account request DTOs match the Joi schemas", () => {
  it("UnlockRequestBodyDto ≡ unlockRequestSchema", async () => {
    await expectDto(UnlockRequestBodyDto, {
      valid: { email: EMAIL },
      paddedUpperCase: { email: "  User@Example.COM  " },
      missing: {},
      null: { email: null },
      empty: { email: "" },
      wrongType: { email: 123 },
      notAnEmail: { email: "user" },
      unknownStripped: { email: EMAIL, extra: "x" }
    });
  });

  it("UnlockVerifyBodyDto ≡ unlockVerifySchema", async () => {
    await expectDto(UnlockVerifyBodyDto, {
      valid: { email: EMAIL, tempPassword: TEMP_PASSWORD },
      paddedTempPasswordKept: {
        email: EMAIL,
        tempPassword: ` ${TEMP_PASSWORD} `
      },
      unknownStripped: { email: EMAIL, tempPassword: TEMP_PASSWORD, extra: 1 },
      empty: {},
      emailMissing: { tempPassword: TEMP_PASSWORD },
      emailInvalid: { email: "user", tempPassword: TEMP_PASSWORD },
      tempPasswordMissing: { email: EMAIL },
      tempPasswordNull: { email: EMAIL, tempPassword: null },
      tempPasswordEmpty: { email: EMAIL, tempPassword: "" },
      tempPasswordWrongType: { email: EMAIL, tempPassword: 123456789012 },
      // TC in lockout-unlock.api.ts: 11 characters is refused, 12 accepted.
      tempPasswordTooShort: { email: EMAIL, tempPassword: "a".repeat(11) }
    });
  });
});
