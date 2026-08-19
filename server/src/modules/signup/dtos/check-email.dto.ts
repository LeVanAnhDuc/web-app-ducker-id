export interface CheckEmailDto {
  available: boolean;
}

export const toCheckEmailDto = (available: boolean): CheckEmailDto => ({
  available
});
