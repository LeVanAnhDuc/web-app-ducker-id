// types
import type { LoginCompletionService } from "@/modules/login/services/login-completion.service";

export function createLoginCompletionServiceMock(): jest.Mocked<LoginCompletionService> {
  return {
    complete: jest.fn()
  } as unknown as jest.Mocked<LoginCompletionService>;
}
