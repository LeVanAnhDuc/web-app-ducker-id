export interface VerifyMagicLinkResponseDto {
  success: boolean;
  resetToken: string;
}

export const toVerifyMagicLinkResponseDto = (
  resetToken: string
): VerifyMagicLinkResponseDto => ({
  success: true,
  resetToken
});
