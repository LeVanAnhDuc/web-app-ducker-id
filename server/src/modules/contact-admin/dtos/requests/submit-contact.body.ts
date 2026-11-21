// libs
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf
} from "class-validator";
// validators
import { CONTACT_CONFIG } from "@/validators/constants";
import { AppEmailRules, Lowercase, Trim } from "@/validators/decorators";

// Joi shipped English for a non-string subject or message; their nearest key
// is `…Required`, as there is no `…Invalid` for either.
export class SubmitContactBodyDto {
  // Optional, and a blank email (after trimming) is kept as "" — a guest may
  // leave it out; a signed-in sender's email comes from the session.
  @AppEmailRules()
  @ValidateIf((_object, value) => value !== undefined && value !== "")
  @Lowercase()
  @Trim()
  email?: string;

  @MaxLength(CONTACT_CONFIG.SUBJECT_MAX_LENGTH, {
    message: "contactAdmin:errors.subjectTooLong"
  })
  @MinLength(CONTACT_CONFIG.SUBJECT_MIN_LENGTH, {
    message: "contactAdmin:errors.subjectTooShort"
  })
  @IsNotEmpty({ message: "contactAdmin:errors.subjectRequired" })
  @IsString({ message: "contactAdmin:errors.subjectRequired" })
  @IsDefined({ message: "contactAdmin:errors.subjectRequired" })
  subject!: string;

  @MaxLength(CONTACT_CONFIG.MESSAGE_MAX_LENGTH, {
    message: "contactAdmin:errors.messageTooLong"
  })
  @MinLength(CONTACT_CONFIG.MESSAGE_MIN_LENGTH, {
    message: "contactAdmin:errors.messageTooShort"
  })
  @IsNotEmpty({ message: "contactAdmin:errors.messageRequired" })
  @IsString({ message: "contactAdmin:errors.messageRequired" })
  @IsDefined({ message: "contactAdmin:errors.messageRequired" })
  message!: string;
}
