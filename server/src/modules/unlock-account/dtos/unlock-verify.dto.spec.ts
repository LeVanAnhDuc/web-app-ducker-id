// common
import { toDto } from "@/common/dto";
// dtos
import { UnlockVerifyDto } from "./unlock-verify.dto";

describe("UnlockVerifyDto", () => {
  it("keeps exactly the four token fields", () => {
    expect(
      toDto(UnlockVerifyDto, {
        accessToken: "a",
        refreshToken: "r",
        idToken: "i",
        expiresIn: 900,
        mustChangePassword: true
      })
    ).toStrictEqual({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 900
    });
  });
});
