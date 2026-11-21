// types
import type { ContactRepository } from "../repository/contact-admin.repository";
// common
import { toDto } from "@/common/dto";
import { NotFoundError } from "@/exceptions";
// dtos
import { AdminContactDetailItemDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const getContactDetail = async (
  contactRepo: ContactRepository,
  id: string
): Promise<AdminContactDetailItemDto> => {
  const doc = await contactRepo.findById(id);

  if (!doc) {
    throw new NotFoundError({
      key: "contactAdmin:errors.notFound",
      code: ERROR_CODES.CONTACT_NOT_FOUND
    });
  }

  return toDto(AdminContactDetailItemDto, doc);
};
