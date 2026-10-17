// types
import type {
  EmailStepFormValues,
  PasswordStepFormValues,
  UnlockVerifyFormValues
} from "@/types/Login";
// others
import CONSTANTS from "@/constants";

const { EMAIL, PASSWORD, TEMP_PASSWORD } =
  CONSTANTS.FIELD_NAMES.LOGIN_FIELD_NAMES;

export const initialEmailStepData: EmailStepFormValues = {
  [EMAIL]: ""
};

export const initialPasswordStepData: PasswordStepFormValues = {
  [PASSWORD]: ""
};

export const initialUnlockVerifyData: UnlockVerifyFormValues = {
  [TEMP_PASSWORD]: ""
};
