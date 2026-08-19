// types
import type { ChangePasswordFormValues } from "@/types/ChangePassword";
// others
import CONSTANTS from "@/constants";

const { CURRENT_PASSWORD, NEW_PASSWORD, CONFIRM_PASSWORD } =
  CONSTANTS.FIELD_NAMES.CHANGE_PASSWORD_FIELD_NAMES;

export const initialChangePasswordData: ChangePasswordFormValues = {
  [CURRENT_PASSWORD]: "",
  [NEW_PASSWORD]: "",
  [CONFIRM_PASSWORD]: ""
};
