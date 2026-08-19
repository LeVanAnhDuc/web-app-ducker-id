// services
import { NodemailerTransport } from "@/services/cores/NodemailerTransport";
// others
import { SendEmailService } from "./email.service";

export const createEmailModule = () => {
  const transport = new NodemailerTransport();
  const emailService = new SendEmailService(transport);

  return { emailService };
};
