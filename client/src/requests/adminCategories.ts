// types
import type { CategoryName } from "@/types/Apps";
import type {
  AdminCategory,
  CategoryDeleteImpact,
  CategoryMoveDirection,
  CategoryReassignment,
  CategoryUpdateInput
} from "@/types/AdminCategories";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";
import { generatePath } from "@/utils";

const { END_POINTS } = CONSTANTS;

export const getAdminCategories = async (): Promise<AdminCategory[]> => {
  const response = await axiosInstance.get<ResponsePattern<AdminCategory[]>>(
    END_POINTS.ADMIN_CATEGORIES
  );
  return response.data.data;
};

export const createAdminCategory = async (
  name: CategoryName
): Promise<AdminCategory> => {
  const response = await axiosInstance.post<ResponsePattern<AdminCategory>>(
    END_POINTS.ADMIN_CATEGORIES,
    { name }
  );
  return response.data.data;
};

export const updateAdminCategory = async (
  id: string,
  input: CategoryUpdateInput
): Promise<AdminCategory> => {
  const response = await axiosInstance.patch<ResponsePattern<AdminCategory>>(
    generatePath(END_POINTS.ADMIN_CATEGORY_BY_ID, { id }),
    input
  );
  return response.data.data;
};

/** Returns the whole list in its new order — the server renumbers every row. */
export const moveAdminCategory = async (
  id: string,
  direction: CategoryMoveDirection
): Promise<AdminCategory[]> => {
  const response = await axiosInstance.post<ResponsePattern<AdminCategory[]>>(
    generatePath(END_POINTS.ADMIN_CATEGORY_MOVE, { id }),
    { direction }
  );
  return response.data.data;
};

export const getCategoryDeleteImpact = async (
  id: string
): Promise<CategoryDeleteImpact> => {
  const response = await axiosInstance.get<
    ResponsePattern<CategoryDeleteImpact>
  >(generatePath(END_POINTS.ADMIN_CATEGORY_DELETE_IMPACT, { id }));
  return response.data.data;
};

export const deleteAdminCategory = async (
  id: string,
  reassignments: CategoryReassignment[]
): Promise<void> => {
  await axiosInstance.delete(
    generatePath(END_POINTS.ADMIN_CATEGORY_BY_ID, { id }),
    { data: { reassignments } }
  );
};
