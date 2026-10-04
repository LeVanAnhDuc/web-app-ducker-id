// types
import type { SubmitContactBody } from "../types";
import type { SubmitContactResponseDto } from "../dtos";
import type { ContactRepository } from "../repository/contact-admin.repository";
// validators
import { sanitizeText, validateStringLength } from "@/validators/utils";
import { CONTACT_CONFIG } from "@/validators/constants";
// dtos
import { toSubmitContactResponseDto } from "../dtos";
// others
import { CONTACT_STATUSES } from "../constants";
import { RequestContext } from "@/utils/request-context";

export const submitContact = async (
  contactRepo: ContactRepository,
  body: SubmitContactBody
): Promise<SubmitContactResponseDto> => {
  const { message, subject, email } = body;

  const sanitizedSubject = sanitizeText(subject);
  const sanitizedMessage = sanitizeText(message);

  validateStringLength(
    sanitizedSubject,
    "subject",
    CONTACT_CONFIG.SUBJECT_MIN_LENGTH,
    CONTACT_CONFIG.SUBJECT_MAX_LENGTH
  );
  validateStringLength(
    sanitizedMessage,
    "message",
    CONTACT_CONFIG.MESSAGE_MIN_LENGTH,
    CONTACT_CONFIG.MESSAGE_MAX_LENGTH
  );

  // Owner attach: nullable — logged-in submitter gets userId, guest stays null.
  // MUST come from RequestContext (server-verified JWT), never from client body.
  const userId = RequestContext.getUserId() ?? null;

  const contact = await contactRepo.create({
    email,
    subject,
    message,
    status: CONTACT_STATUSES.NEW,
    userId
  });

  return toSubmitContactResponseDto(contact);
};
