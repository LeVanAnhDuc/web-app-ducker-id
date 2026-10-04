// types
import type { AuthenticationService } from "@/modules/authentication/service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { UserRepository } from "../repository/user.repository";

export interface UserServiceDeps {
  userRepo: UserRepository;
  authService: AuthenticationService;
  emailDispatcher: EmailDispatcher;
}
