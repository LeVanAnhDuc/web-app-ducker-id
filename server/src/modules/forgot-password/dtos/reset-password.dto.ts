export interface ResetPasswordResponseDto {
  success: boolean;
}

export const toResetPasswordResponseDto = (): ResetPasswordResponseDto => ({
  success: true
});
