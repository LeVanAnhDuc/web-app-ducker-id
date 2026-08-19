// types
import type { AdminAppFormValues } from "@/types/AdminApps";
// others
import CONSTANTS from "@/constants";

const { AUTHENTICATION_ROLES, APP_STATUS } = CONSTANTS;

export const initialAdminAppData: AdminAppFormValues = {
  name: "",
  displayName: "",
  description: "",
  iconUrl: "",
  homeUrl: "",
  categoryId: "",
  status: APP_STATUS.ACTIVE,
  requiredRoles: [AUTHENTICATION_ROLES.USER],
  redirectUris: []
};
