// types
import type { AuthTokensResponse } from "@/modules/authentication/types";
// common
import { toDto } from "@/common/dto";
// others
import { LoginResponseDto } from "./login-response.dto";

describe("LoginResponseDto", () => {
  it("maps AuthTokensResponse fields 1:1", () => {
    const input: AuthTokensResponse = {
      accessToken: "access-xyz",
      refreshToken: "refresh-xyz",
      idToken: "id-xyz",
      expiresIn: 3600
    };

    const result = toDto(LoginResponseDto, input);

    expect(result).toEqual({
      accessToken: "access-xyz",
      refreshToken: "refresh-xyz",
      idToken: "id-xyz",
      expiresIn: 3600
    });
  });

  it("does not leak extra fields from input", () => {
    const input = {
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 60,
      internalSecret: "leak"
    } as unknown as AuthTokensResponse;

    const result = toDto(LoginResponseDto, input);

    expect(Object.keys(result).sort()).toEqual([
      "accessToken",
      "expiresIn",
      "idToken",
      "refreshToken"
    ]);
  });
});
