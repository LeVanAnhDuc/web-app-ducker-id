// modules
import { ChangePasswordBodyDto } from "@/modules/change-password/dtos/requests";
// validators
import { changePasswordSchema } from "@/validators/schemas/change-password";
// others
import { expectParity } from "@test/helpers/validation-parity";

const VALID = {
  currentPassword: "OldSecret1!",
  newPassword: "Secret1!",
  confirmPassword: "Secret1!"
};

const without = (field: keyof typeof VALID) => {
  const body: Record<string, unknown> = { ...VALID };
  delete body[field];
  return body;
};

describe("change-password request DTO matches the Joi schema", () => {
  it("ChangePasswordBodyDto ≡ changePasswordSchema", async () => {
    await expectParity(changePasswordSchema, ChangePasswordBodyDto, {
      valid: VALID,
      // The current password is compared with the stored hash, never re-policed.
      weakCurrentPasswordAccepted: { ...VALID, currentPassword: "a" },
      unknownStripped: { ...VALID, logoutOthers: true },
      empty: {},

      currentPasswordMissing: without("currentPassword"),
      currentPasswordNull: { ...VALID, currentPassword: null },
      currentPasswordEmpty: { ...VALID, currentPassword: "" },
      currentPasswordWrongType: { ...VALID, currentPassword: 123 },

      newPasswordMissing: without("newPassword"),
      newPasswordEmpty: { ...VALID, newPassword: "", confirmPassword: "" },
      newPasswordWrongType: { ...VALID, newPassword: 12345678 },
      newPasswordTooShort: {
        ...VALID,
        newPassword: "Se1!",
        confirmPassword: "Se1!"
      },
      newPasswordTooLong: {
        ...VALID,
        newPassword: `Secret1!${"a".repeat(121)}`,
        confirmPassword: `Secret1!${"a".repeat(121)}`
      },
      newPasswordPatternBreak: {
        ...VALID,
        newPassword: "secretpassword",
        confirmPassword: "secretpassword"
      },

      confirmPasswordMissing: without("confirmPassword"),
      confirmPasswordNull: { ...VALID, confirmPassword: null },
      confirmPasswordEmpty: { ...VALID, confirmPassword: "" },
      confirmPasswordWrongType: { ...VALID, confirmPassword: 123 },
      confirmPasswordMismatch: { ...VALID, confirmPassword: "Secret2!" },
      confirmPasswordCaseMismatch: { ...VALID, confirmPassword: "secret1!" }
    });
  });
});
