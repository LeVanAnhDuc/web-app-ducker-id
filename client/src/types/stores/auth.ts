import type { LoginTokenResponse } from "@/types/Login";

export type AuthState = {
  tokens: LoginTokenResponse | null;
  hasBootstrapped: boolean;
};

export type AuthActions = {
  setTokens: (tokens: LoginTokenResponse) => void;
  clearTokens: () => void;
  setHasBootstrapped: (value: boolean) => void;
  logout: () => Promise<void>;
};

export type AuthStore = AuthState & AuthActions;
