// types
import type { RefreshTokenDto } from "../dtos";
import type { TokenServiceDeps } from "./deps";
// others
import { refreshAccessToken } from "./refresh-access-token";
import { revokeRefreshToken } from "./revoke-refresh-token";

export class TokenService {
  constructor(private readonly deps: TokenServiceDeps) {}

  refreshAccessToken(
    refreshToken: string | undefined
  ): Promise<RefreshTokenDto> {
    return refreshAccessToken(this.deps, refreshToken);
  }

  revokeRefreshToken(refreshToken: string | undefined): Promise<void> {
    return revokeRefreshToken(this.deps, refreshToken);
  }
}
