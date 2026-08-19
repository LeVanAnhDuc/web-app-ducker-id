export interface MagicLinkSendDto {
  success: boolean;
  expiresIn: number;
  cooldown: number;
}

export const toMagicLinkSendDto = (
  expiresIn: number,
  cooldown: number
): MagicLinkSendDto => ({
  success: true,
  expiresIn,
  cooldown
});
