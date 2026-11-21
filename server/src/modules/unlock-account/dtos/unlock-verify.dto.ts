// common
import { Expose } from "@/common/dto";

/** Source: `AuthTokensResponse` — exactly the four token fields, nothing else. */
export class UnlockVerifyDto {
  @Expose() accessToken!: string;
  @Expose() refreshToken!: string;
  @Expose() idToken!: string;
  @Expose() expiresIn!: number;
}
