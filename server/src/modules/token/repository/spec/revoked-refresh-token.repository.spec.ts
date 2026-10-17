// types
import type { RedisClientType } from "redis";
// others
import { TOKEN } from "@/constants/redis/store";
import { RedisRevokedRefreshTokenRepository } from "../impl/redis-revoked-refresh-token.repository";

const TOKEN_VALUE = "header.payload.signature";

const setup = () => {
  const client = { setEx: jest.fn(), exists: jest.fn() };
  const repo = new RedisRevokedRefreshTokenRepository(
    client as unknown as RedisClientType
  );
  return { client, repo };
};

describe("RedisRevokedRefreshTokenRepository", () => {
  it("stores a hash of the token, never the token, with the given TTL", async () => {
    const { client, repo } = setup();
    client.setEx.mockResolvedValue("OK");

    await repo.revoke(TOKEN_VALUE, 120);

    const [key, ttl] = client.setEx.mock.calls[0] as [string, number];
    expect(key).toMatch(new RegExp(`^${TOKEN.REVOKED_REFRESH}:[0-9a-f]{64}$`));
    expect(key).not.toContain(TOKEN_VALUE);
    expect(ttl).toBe(120);
  });

  it("reports a revoked token by the same key", async () => {
    const { client, repo } = setup();
    client.setEx.mockResolvedValue("OK");
    client.exists.mockResolvedValue(1);

    await repo.revoke(TOKEN_VALUE, 120);
    const revoked = await repo.isRevoked(TOKEN_VALUE);

    expect(revoked).toBe(true);
    expect(client.exists).toHaveBeenCalledWith(client.setEx.mock.calls[0][0]);
  });

  it("reports an unknown token as live", async () => {
    const { client, repo } = setup();
    client.exists.mockResolvedValue(0);

    expect(await repo.isRevoked(TOKEN_VALUE)).toBe(false);
  });
});
