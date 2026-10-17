// types
import type { WebAppDocument } from "@/modules/web-app/types";
import type { OAuthRepository } from "../../repository/oauth.repository";
import type { TokenRequestBody } from "../../types";
import type { OAuthServiceDeps } from "../deps";
// common
import { OAuthError } from "@/common/exceptions";
// others
import { exchangeToken } from "../exchange-token";

const CLIENT_ID = "badminton";
const REDIRECT_URI = "https://badminton.example.com/callback";
const VERIFIER = "a".repeat(64);

const setup = () => {
  const oauthRepo = {
    consumeCode: jest.fn().mockResolvedValue({
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      codeChallenge: "challenge",
      scopes: ["openid"],
      sub: "user-1",
      authId: "auth-1",
      sid: "sid-1",
      authTime: 1
    })
  } as unknown as jest.Mocked<OAuthRepository>;
  const webAppRepo = {
    findByClientId: jest.fn().mockResolvedValue({
      clientId: CLIENT_ID,
      status: "ACTIVE",
      tokenEndpointAuthMethod: "none"
    } as unknown as WebAppDocument)
  };

  const deps = { oauthRepo, webAppRepo } as unknown as OAuthServiceDeps;
  return { deps, oauthRepo };
};

const body = (over: Partial<TokenRequestBody> = {}): TokenRequestBody =>
  ({
    grant_type: "authorization_code",
    code: "code-1",
    code_verifier: VERIFIER,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    ...over
  }) as TokenRequestBody;

const expectOAuthError = async (
  promise: Promise<unknown>,
  error: string
): Promise<void> => {
  await expect(promise).rejects.toBeInstanceOf(OAuthError);
  await expect(promise).rejects.toMatchObject({ oauthError: error });
};

describe("exchangeToken — request validation", () => {
  it.each([42, 129])(
    "refuses a %i-character code_verifier without burning the code (BUG-OIDC-03)",
    async (length) => {
      const { deps, oauthRepo } = setup();

      await expectOAuthError(
        exchangeToken(deps, body({ code_verifier: "a".repeat(length) })),
        "invalid_request"
      );
      expect(oauthRepo.consumeCode).not.toHaveBeenCalled();
    }
  );

  it("refuses a code_verifier outside the RFC 7636 alphabet", async () => {
    const { deps } = setup();

    await expectOAuthError(
      exchangeToken(deps, body({ code_verifier: `${"a".repeat(50)}+/=` })),
      "invalid_request"
    );
  });

  it("refuses a request that leaves out redirect_uri (BUG-OIDC-06)", async () => {
    const { deps } = setup();

    await expectOAuthError(
      exchangeToken(deps, body({ redirect_uri: undefined })),
      "invalid_request"
    );
  });

  it("refuses a redirect_uri other than the authorize request's", async () => {
    const { deps } = setup();

    await expectOAuthError(
      exchangeToken(
        deps,
        body({ redirect_uri: "https://badminton.example.com/other" })
      ),
      "invalid_grant"
    );
  });

  it("gets as far as PKCE with a well-formed request", async () => {
    const { deps } = setup();

    const promise = exchangeToken(deps, body());

    await expect(promise).rejects.toMatchObject({
      oauthError: "invalid_grant",
      description: "PKCE verification failed"
    });
  });
});
