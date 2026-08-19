// types
import type { AuthTokensResponse } from "@/modules/authentication/types";
import type { Schema } from "mongoose";

export interface CompleteSignupDto {
  success: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  tokens: AuthTokensResponse;
}

export const toCompleteSignupDto = (
  account: {
    authId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    email: string;
    fullName: string;
  },
  tokens: AuthTokensResponse
): CompleteSignupDto => ({
  success: true,
  user: {
    id: account.userId.toString(),
    email: account.email,
    fullName: account.fullName
  },
  tokens
});
