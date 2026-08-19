export interface SendOtpDto {
  success: boolean;
  expiresIn: number;
  cooldownSeconds: number;
}

export const toSendOtpDto = (
  expiresIn: number,
  cooldownSeconds: number
): SendOtpDto => ({
  success: true,
  expiresIn,
  cooldownSeconds
});
