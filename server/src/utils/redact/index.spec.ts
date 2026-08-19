// others
import { redactSensitive } from "./index";

describe("redactSensitive", () => {
  it("redacts sensitive keys in a flat object, keeps the rest", () => {
    expect(redactSensitive({ email: "a@b.com", password: "secret" })).toEqual({
      email: "a@b.com",
      password: "[REDACTED]"
    });
  });

  it("redacts nested and array values", () => {
    expect(
      redactSensitive({ user: { newPassword: "x" }, list: [{ token: "t" }] })
    ).toEqual({
      user: { newPassword: "[REDACTED]" },
      list: [{ token: "[REDACTED]" }]
    });
  });

  it("matches case-insensitively and by substring variants", () => {
    expect(
      redactSensitive({
        PassWord: "1",
        accessToken: "2",
        refreshToken: "3",
        confirmPassword: "4",
        otp: "5"
      })
    ).toEqual({
      PassWord: "[REDACTED]",
      accessToken: "[REDACTED]",
      refreshToken: "[REDACTED]",
      confirmPassword: "[REDACTED]",
      otp: "[REDACTED]"
    });
  });

  it("returns non-object values unchanged", () => {
    expect(redactSensitive("x")).toBe("x");
    expect(redactSensitive(123)).toBe(123);
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
  });

  it("does not mutate the input", () => {
    const input = { password: "secret", email: "a@b.com" };
    redactSensitive(input);
    expect(input.password).toBe("secret");
  });

  it("caps recursion depth without crashing", () => {
    let deep: Record<string, unknown> = { v: 1 };
    for (let i = 0; i < 50; i++) deep = { nested: deep };
    expect(() => redactSensitive(deep)).not.toThrow();
  });
});
