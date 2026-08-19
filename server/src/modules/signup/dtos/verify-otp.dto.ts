export interface VerifyOtpDto {
  success: boolean;
  sessionToken: string;
  expiresIn: number;
}

export const toVerifyOtpDto = (
  sessionToken: string,
  expiresIn: number
): VerifyOtpDto => ({
  success: true,
  sessionToken,
  expiresIn
});
