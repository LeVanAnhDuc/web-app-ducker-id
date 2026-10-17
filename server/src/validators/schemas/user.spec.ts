// validators
import { updateProfileSchema } from "./user";

const OPTIONS = { abortEarly: false, stripUnknown: true };

const yearsAgo = (years: number, days = 0): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const messagesOf = (result: { error?: { details: { message: string }[] } }) =>
  result.error?.details.map((d) => d.message) ?? [];

describe("updateProfileSchema", () => {
  it("refuses a whitespace-only full name", () => {
    const result = updateProfileSchema.validate({ fullName: "   " }, OPTIONS);
    expect(messagesOf(result)).toEqual(["validation:fullName.required"]);
  });

  it("trims the full name it accepts", () => {
    const { value, error } = updateProfileSchema.validate(
      { fullName: "  Hoa Tran  " },
      OPTIONS
    );
    expect(error).toBeUndefined();
    expect(value.fullName).toBe("Hoa Tran");
  });

  it("accepts null to clear an optional field", () => {
    const { value, error } = updateProfileSchema.validate(
      { phone: null, address: null, dateOfBirth: null, gender: null },
      OPTIONS
    );
    expect(error).toBeUndefined();
    expect(value).toEqual({
      phone: null,
      address: null,
      dateOfBirth: null,
      gender: null
    });
  });

  it("still refuses an empty phone string", () => {
    const result = updateProfileSchema.validate({ phone: "" }, OPTIONS);
    expect(messagesOf(result)).toEqual(["validation:phone.invalid"]);
  });

  it("accepts the sign-up age range of 13 to 120 years", () => {
    for (const dateOfBirth of [yearsAgo(13, -1), yearsAgo(110), yearsAgo(119)])
      expect(
        updateProfileSchema.validate({ dateOfBirth }, OPTIONS).error
      ).toBeUndefined();
  });

  it("refuses a date of birth under 13 or over 120 years ago", () => {
    expect(
      messagesOf(
        updateProfileSchema.validate({ dateOfBirth: yearsAgo(12) }, OPTIONS)
      )
    ).toEqual(["validation:dateOfBirth.tooYoung"]);
    expect(
      messagesOf(
        updateProfileSchema.validate({ dateOfBirth: yearsAgo(121) }, OPTIONS)
      )
    ).toEqual(["validation:dateOfBirth.tooOld"]);
  });
});
