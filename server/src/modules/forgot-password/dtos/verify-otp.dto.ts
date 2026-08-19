export interface VerifyOtpResponseDto {
  success: boolean;
  resetToken: string;
}

export const toVerifyOtpResponseDto = (
  resetToken: string
): VerifyOtpResponseDto => ({
  success: true,
  resetToken
});
