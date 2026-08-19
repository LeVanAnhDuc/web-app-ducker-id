export interface UnlockRequestDto {
  success: boolean;
}

export const toUnlockRequestDto = (): UnlockRequestDto => ({
  success: true
});
