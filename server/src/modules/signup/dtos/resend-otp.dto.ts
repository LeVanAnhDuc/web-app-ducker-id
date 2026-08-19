export interface ResendOtpDto {
  success: boolean;
  expiresIn: number;
  cooldownSeconds: number;
  resendCount: number;
  maxResends: number;
  remainingResends: number;
}

export const toResendOtpDto = (
  expiresIn: number,
  cooldownSeconds: number,
  resendCount: number,
  maxResends: number
): ResendOtpDto => ({
  success: true,
  expiresIn,
  cooldownSeconds,
  resendCount,
  maxResends,
  remainingResends: maxResends - resendCount
});
