export interface SessionSignupRepository {
  createToken(): string;
  store(email: string, sessionId: string, expiry: number): Promise<void>;
  createAndStore(email: string, expiry: number): Promise<string>;
  verify(email: string, sessionId: string): Promise<boolean>;
  clear(email: string): Promise<void>;
}
