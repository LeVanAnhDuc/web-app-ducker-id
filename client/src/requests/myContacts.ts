// types
import type {
  MyContactDetail,
  MyContactsQueryParams,
  PaginatedMyContactsResponse
} from "@/types/MyContacts";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";
import { generatePath } from "@/utils";

const { END_POINTS } = CONSTANTS;

export const getMyContacts = async (
  params?: MyContactsQueryParams
): Promise<PaginatedMyContactsResponse> => {
  const response = await axiosInstance.get<
    ResponsePattern<PaginatedMyContactsResponse>
  >(END_POINTS.MY_CONTACTS, { params });
  return response.data.data;
};

export const getMyContactById = async (
  id: string
): Promise<MyContactDetail> => {
  const response = await axiosInstance.get<ResponsePattern<MyContactDetail>>(
    generatePath(END_POINTS.MY_CONTACT_BY_ID, { id })
  );
  return response.data.data;
};
