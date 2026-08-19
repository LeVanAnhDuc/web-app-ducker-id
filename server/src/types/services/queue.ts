// types
import type { EmailType } from "./email";

export interface EmailJobData {
  type: EmailType;
  email: string;
  data: Record<string, unknown>;
  locale?: string;
}
