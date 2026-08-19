export type SendOtpResponse = {
  success: boolean;
  expiresIn: number;
  cooldown: number;
};

export type VerifyOtpResponse = {
  success: boolean;
  resetToken: string;
};

export type SendMagicLinkResponse = {
  success: boolean;
  expiresIn: number;
  cooldown: number;
};

export type VerifyMagicLinkResponse = {
  success: boolean;
  resetToken: string;
};

export type ResetPasswordResponse = {
  success: boolean;
};
