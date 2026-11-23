// others
import { MongoAuthenticationRepository } from "./repository/impl/mongo-authentication.repository";
import { AuthenticationService } from "./authentication.service";

export const createAuthenticationModule = () => {
  const authRepo = new MongoAuthenticationRepository();
  const authService = new AuthenticationService(authRepo);

  return { authService };
};
