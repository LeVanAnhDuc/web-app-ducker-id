// types
import type { SubmitContactBodyDto } from "../dtos/requests";
import type { ContactRepository } from "../repository/contact-admin.repository";
// common
import { toDto } from "@/common/dto";
// dtos
import { SubmitContactResponseDto } from "../dtos";
// others
import { CONTACT_STATUSES } from "../constants";
import { RequestContext } from "@/utils/request-context";

export const submitContact = async (
  contactRepo: ContactRepository,
  body: SubmitContactBodyDto,
  ipAddress: string | null
): Promise<SubmitContactResponseDto> => {
  const { message, subject, email } = body;

  // MUST come from RequestContext (server-verified JWT), never from client body.
  const userId = RequestContext.getUserId() ?? null;

  const contact = await contactRepo.create({
    email,
    subject,
    message,
    status: CONTACT_STATUSES.NEW,
    userId,
    ipAddress
  });

  return toDto(SubmitContactResponseDto, contact);
};
