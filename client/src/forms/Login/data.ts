// types
import type {
  EmailStepFormValues,
  PasswordStepFormValues
} from "@/types/Login";
// others
import CONSTANTS from "@/constants";

const { EMAIL, PASSWORD } = CONSTANTS.FIELD_NAMES.LOGIN_FIELD_NAMES;

export const initialEmailStepData: EmailStepFormValues = {
  [EMAIL]: ""
};

export const initialPasswordStepData: PasswordStepFormValues = {
  [PASSWORD]: ""
};
