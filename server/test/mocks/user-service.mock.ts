// types
import type { UserService } from "@/modules/user/user.service";

export function createUserServiceMock(): jest.Mocked<UserService> {
  return {
    findByEmailWithAuth: jest.fn()
  } as unknown as jest.Mocked<UserService>;
}
