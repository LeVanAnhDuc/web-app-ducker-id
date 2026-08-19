// types
import type {
  SupportFormValues,
  SubmitSupportResponse,
  SubmitSupportPayload
} from "@/types/Support";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const submitSupport = async (
  data: SupportFormValues
): Promise<SubmitSupportResponse> => {
  const payload: SubmitSupportPayload = {
    subject: data.subject,
    message: data.message
  };
  if (data.email) payload.email = data.email;

  const response = await axiosInstance.post<
    ResponsePattern<SubmitSupportResponse>
  >(END_POINTS.CONTACT_SUBMIT, payload);

  return response.data.data;
};
