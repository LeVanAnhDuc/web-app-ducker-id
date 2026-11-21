// types
import type { ContactStatus } from "../types";
import type { UpdateContactStatusDto } from "../dtos";
import type { ContactRepository } from "../repository/contact-admin.repository";
// common
import { NotFoundError } from "@/exceptions";
// dtos
import { toUpdateContactStatusDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const updateContactStatus = async (
  contactRepo: ContactRepository,
  id: string,
  status: ContactStatus
): Promise<UpdateContactStatusDto> => {
  const updated = await contactRepo.updateStatus(id, status);

  if (!updated) {
    throw new NotFoundError({
      key: "contactAdmin:errors.notFound",
      code: ERROR_CODES.CONTACT_NOT_FOUND
    });
  }

  return toUpdateContactStatusDto(updated);
};
