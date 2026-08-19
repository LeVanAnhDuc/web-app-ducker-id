export interface SendMagicLinkResponseDto {
  success: boolean;
  expiresIn: number;
  cooldown: number;
}

export const toSendMagicLinkResponseDto = (
  expiresIn: number,
  cooldown: number
): SendMagicLinkResponseDto => ({
  success: true,
  expiresIn,
  cooldown
});
