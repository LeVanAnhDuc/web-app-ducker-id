export interface SendOtpResponseDto {
  success: boolean;
  expiresIn: number;
  cooldown: number;
}

export const toSendOtpResponseDto = (
  expiresIn: number,
  cooldown: number
): SendOtpResponseDto => ({
  success: true,
  expiresIn,
  cooldown
});
