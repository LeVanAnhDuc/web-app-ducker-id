// types
import type { ContactDetailItemDto } from "../dtos";
import type { ContactRepository } from "../repository/contact-admin.repository";
// common
import { NotFoundError } from "@/common/exceptions";
// dtos
import { toContactDetailItemDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const getContactDetail = async (
  contactRepo: ContactRepository,
  id: string
): Promise<ContactDetailItemDto> => {
  const doc = await contactRepo.findById(id);

  if (!doc) {
    throw new NotFoundError({
      i18nMessage: (t) => t("contactAdmin:errors.notFound"),
      code: ERROR_CODES.CONTACT_NOT_FOUND
    });
  }

  return toContactDetailItemDto(doc);
};
