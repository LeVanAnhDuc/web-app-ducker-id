// types
import type { ForgotPasswordResetFormValues } from "@/types/ForgotPasswordReset";
// constants
import CONSTANTS from "@/constants";

const { NEW_PASSWORD, CONFIRM_PASSWORD } =
  CONSTANTS.FIELD_NAMES.FORGOT_PASSWORD_FIELD_NAMES;

export const initialForgotPasswordResetFormData: ForgotPasswordResetFormValues =
  {
    [NEW_PASSWORD]: "",
    [CONFIRM_PASSWORD]: ""
  };
