// common
import { BadRequestError } from "@/common/exceptions";
// others
import { SamePasswordGuard } from "./same-password.guard";

describe("SamePasswordGuard", () => {
  const guard = new SamePasswordGuard();

  it("throws when new equals current", () => {
    expect(() => guard.assert("samePass1!", "samePass1!")).toThrow(
      BadRequestError
    );
  });

  it("passes when new differs from current", () => {
    expect(() => guard.assert("oldPass1!", "newPass1!")).not.toThrow();
  });
});
