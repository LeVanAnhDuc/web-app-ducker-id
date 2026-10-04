// others
import { MongoAuthenticationRepository } from "./repository/impl/mongo-authentication.repository";
import { AuthenticationService } from "./service";

export const createAuthenticationModule = () => {
  const authRepo = new MongoAuthenticationRepository();
  const authService = new AuthenticationService(authRepo);

  return { authService };
};
