// types
import type { UserService } from "@/modules/user/services";

export function createUserServiceMock(): jest.Mocked<UserService> {
  return {
    findByEmailWithAuth: jest.fn()
  } as unknown as jest.Mocked<UserService>;
}
