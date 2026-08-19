export interface OtpSendDto {
  success: boolean;
  expiresIn: number;
  cooldown: number;
}

export const toOtpSendDto = (
  expiresIn: number,
  cooldown: number
): OtpSendDto => ({
  success: true,
  expiresIn,
  cooldown
});
