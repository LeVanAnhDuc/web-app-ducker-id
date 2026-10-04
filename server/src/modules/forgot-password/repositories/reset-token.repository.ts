export interface ResetTokenRepository {
  readonly RESET_TOKEN_EXPIRY_SECONDS: number;
  createToken(): string;
  storeHashed(email: string, token: string): Promise<void>;
  verify(email: string, token: string): Promise<boolean>;
  clear(email: string): Promise<void>;
  createAndStore(email: string): Promise<string>;
}
