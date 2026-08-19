// types
import type { SendEmailService } from "@/services/email/email.service";
// services
import { createEmailModule } from "@/services/email/email.module";
// others
import { Logger } from "@/libs/logger";

export interface AppServices {
  emailService: SendEmailService;
}

export const loadServices = (): AppServices => {
  const { emailService } = createEmailModule();

  Logger.info("Services loaded successfully");

  return { emailService };
};
