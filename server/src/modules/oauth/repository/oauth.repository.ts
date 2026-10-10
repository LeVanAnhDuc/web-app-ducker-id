// types
import type {
  AuthorizationCodeRecord,
  PendingAuthorizeRequest
} from "../types";

export interface OAuthRepository {
  storeCode(record: AuthorizationCodeRecord): Promise<string>;
  consumeCode(code: string): Promise<AuthorizationCodeRecord | null>;
  storePendingRequest(request: PendingAuthorizeRequest): Promise<string>;
  consumePendingRequest(id: string): Promise<PendingAuthorizeRequest | null>;
}
