/**
 * Denylist of refresh tokens ended by logout. A refresh token is a stateless
 * JWT, so without this list a copy taken before logout keeps minting access
 * tokens until it expires (BUG-AUTH-01). Entries live only as long as the
 * token itself would have.
 */
export interface RevokedRefreshTokenRepository {
  revoke(token: string, ttlSeconds: number): Promise<void>;
  isRevoked(token: string): Promise<boolean>;
}
