// types
import type { ContactDetailItemDto } from "../dtos";
import type { ContactRepository } from "../repository/contact-admin.repository";
// common
import { NotFoundError } from "@/common/exceptions";
// dtos
import { toContactDetailItemDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const getMyContactDetail = async (
  contactRepo: ContactRepository,
  id: string,
  userId: string
): Promise<ContactDetailItemDto> => {
  const doc = await contactRepo.findByIdForUser(id, userId);

  if (!doc) {
    // Own vs. other-user's contact are indistinguishable to the caller —
    // both surface as 404 CONTACT_NOT_FOUND to avoid leaking existence.
    throw new NotFoundError({
      i18nMessage: (t) => t("contactAdmin:errors.notFound"),
      code: ERROR_CODES.CONTACT_NOT_FOUND
    });
  }

  return toContactDetailItemDto(doc);
};
