// types
import type {
  EntitlementChange,
  EntitlementMatrixResponse
} from "@/types/AdminEntitlements";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const getUserAccess = async (
  userIds: string[]
): Promise<EntitlementMatrixResponse> => {
  const response = await axiosInstance.get<
    ResponsePattern<EntitlementMatrixResponse>
  >(END_POINTS.ADMIN_ENTITLEMENTS, { params: { userIds: userIds.join(",") } });
  return response.data.data;
};

export const updateUserAccess = async (
  changes: EntitlementChange[]
): Promise<EntitlementMatrixResponse> => {
  const response = await axiosInstance.patch<
    ResponsePattern<EntitlementMatrixResponse>
  >(END_POINTS.ADMIN_ENTITLEMENTS, { changes });
  return response.data.data;
};
