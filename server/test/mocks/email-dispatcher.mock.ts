// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";

export function createEmailDispatcherMock(): jest.Mocked<EmailDispatcher> {
  return {
    send: jest.fn()
  } as unknown as jest.Mocked<EmailDispatcher>;
}
