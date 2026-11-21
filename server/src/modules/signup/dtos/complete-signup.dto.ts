// types
import type { AuthTokensResponse } from "@/modules/authentication/types";
import type { Schema } from "mongoose";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { AccessTokensDto } from "@/modules/token/dtos";

export class CompleteSignupUserDto {
  @ApiProperty({
    type: "string",
    example: "64f1b2c3d4e5f6a7b8c9d0e1",
    description: "User ID (MongoDB ObjectId)"
  })
  id!: string;

  @ApiProperty({ type: "string", example: "user@example.com" })
  email!: string;

  @ApiProperty({ type: "string", example: "Nguyen Van A" })
  fullName!: string;
}

/**
 * What the route sends. The service returns a `CompleteSignupResult`, whose
 * tokens still hold the refresh token; the controller moves that into its
 * HttpOnly cookie, so only `AccessTokensDto` is sent.
 */
export class CompleteSignupDto {
  @ApiProperty({ type: "boolean", example: true })
  success!: boolean;

  @ApiProperty({ type: CompleteSignupUserDto })
  user!: CompleteSignupUserDto;

  @ApiProperty({
    type: AccessTokensDto,
    description:
      "The refresh token is not here: it is set as an HttpOnly cookie"
  })
  tokens!: AccessTokensDto;
}

/** The service's result: `CompleteSignupDto` before the refresh token is moved out. */
export type CompleteSignupResult = Omit<CompleteSignupDto, "tokens"> & {
  tokens: AuthTokensResponse;
};

export const toCompleteSignupDto = (
  account: {
    authId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    email: string;
    fullName: string;
  },
  tokens: AuthTokensResponse
): CompleteSignupResult => ({
  success: true,
  user: {
    id: account.userId.toString(),
    email: account.email,
    fullName: account.fullName
  },
  tokens
});
