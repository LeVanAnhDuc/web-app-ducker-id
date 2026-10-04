// types
import type { Request } from "express";
import type { WebAppDocument } from "@/modules/web-app/types";
import type { WebAppRepository } from "@/modules/web-app/repositories/web-app.repository";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { SessionService } from "@/modules/session/services";
import type { RecentAppService } from "@/modules/recent-app/services";
import type { SessionRecord } from "@/modules/session/types";
import type { OAuthRepository } from "../../repository/oauth.repository";
import type { AuthorizeParams } from "../../types";
// module under test
import { OAuthService } from "../";
// common
import { OAuthError } from "@/common/exceptions";
// mocks
import { createLoginHistoryServiceMock } from "@test/mocks/login-history-service.mock";

const CLIENT_ID = "match-cv";
const REDIRECT_URI = "https://matchcv.example.com/callback";
const AUTH_ID = "64b7f0c2f1a2b3c4d5e6f7b9";

const makeClient = (overrides: Partial<WebAppDocument> = {}) =>
  ({
    _id: { toString: () => "64b7f0c2f1a2b3c4d5e6f7c1" },
    clientId: CLIENT_ID,
    displayName: "Match CV",
    status: "ACTIVE",
    redirectUris: [REDIRECT_URI],
    responseTypes: ["code"],
    scopes: ["openid", "profile", "email"],
    requiredRoles: [],
    ...overrides
  }) as unknown as WebAppDocument;

const makeSession = (
  overrides: Partial<SessionRecord> = {}
): SessionRecord => ({
  sid: "sid-1",
  authId: AUTH_ID,
  userId: "64b7f0c2f1a2b3c4d5e6f7d2",
  roles: "user",
  authTime: Math.floor(Date.now() / 1000),
  ip: "127.0.0.1",
  userAgent: "UA",
  clients: [],
  ...overrides
});

const pendingParams: AuthorizeParams = {
  clientId: CLIENT_ID,
  redirectUri: REDIRECT_URI,
  responseType: "code",
  scopes: ["openid"],
  state: "xyz",
  codeChallenge: "challenge",
  codeChallengeMethod: "S256"
} as AuthorizeParams;

const freshQuery = {
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: "openid",
  state: "xyz",
  code_challenge: "challenge",
  code_challenge_method: "S256"
};

const USER_ID = "64b7f0c2f1a2b3c4d5e6f7d9";

const setup = ({
  client = makeClient(),
  session = makeSession() as SessionRecord | null,
  user = { _id: USER_ID, email: "user@test.com" } as {
    _id: string;
    email: string;
  } | null
} = {}) => {
  const oauthRepo = {
    storePendingRequest: jest.fn().mockResolvedValue("req-1"),
    consumePendingRequest: jest.fn().mockResolvedValue(pendingParams),
    storeCode: jest.fn().mockResolvedValue("code-1")
  } as unknown as OAuthRepository;
  const webAppRepo = {
    findByClientId: jest.fn().mockResolvedValue(client)
  } as unknown as WebAppRepository;
  const sessionService = {
    resolve: jest.fn().mockResolvedValue(session),
    registerClient: jest.fn().mockResolvedValue(undefined)
  } as unknown as SessionService;
  const userService = {
    findByAuthId: jest.fn().mockResolvedValue(user)
  } as unknown as UserService;
  const loginHistoryService = createLoginHistoryServiceMock();
  const recentAppService = {
    record: jest.fn().mockResolvedValue(undefined)
  } as unknown as RecentAppService;

  const service = new OAuthService({
    oauthRepo,
    webAppRepo,
    sessionService,
    authService: {} as AuthenticationService,
    userService,
    loginHistoryService,
    recentAppService
  });

  return { service, loginHistoryService, userService, recentAppService };
};

const reqWith = (query: Record<string, string>) =>
  ({ query, headers: {} }) as unknown as Request;

// The audit runs fire-and-forget after the redirect is decided.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("OAuthService.authorize — app sign-in audit", () => {
  it("records a silent SSO when a code is issued from an existing session", async () => {
    const { service, loginHistoryService } = setup();

    const outcome = await service.authorize(reqWith(freshQuery));
    await flush();

    expect(outcome.kind).toBe("redirect");
    expect(loginHistoryService.recordAppSignIn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: AUTH_ID,
        usernameAttempted: "user@test.com",
        app: expect.objectContaining({
          clientName: "Match CV",
          interactive: false
        })
      })
    );
  });

  it("records an interactive sign-in when resuming right after a login", async () => {
    const { service, loginHistoryService } = setup();

    await service.authorize(reqWith({ auth_req: "req-1" }));
    await flush();

    expect(loginHistoryService.recordAppSignIn).toHaveBeenCalledWith(
      expect.objectContaining({
        app: expect.objectContaining({ interactive: true })
      })
    );
  });

  it("treats a resume on top of an older session as silent", async () => {
    const stale = Math.floor(Date.now() / 1000) - 60 * 60;
    const { service, loginHistoryService } = setup({
      session: makeSession({ authTime: stale })
    });

    await service.authorize(reqWith({ auth_req: "req-1" }));
    await flush();

    expect(loginHistoryService.recordAppSignIn).toHaveBeenCalledWith(
      expect.objectContaining({
        app: expect.objectContaining({ interactive: false })
      })
    );
  });

  it("records a denied sign-in when the user lacks the required role", async () => {
    const { service, loginHistoryService } = setup({
      client: makeClient({ requiredRoles: ["admin"] } as never)
    });

    await expect(service.authorize(reqWith(freshQuery))).rejects.toBeInstanceOf(
      OAuthError
    );
    await flush();

    expect(loginHistoryService.recordAppSignInDenied).toHaveBeenCalledWith(
      expect.objectContaining({
        app: expect.objectContaining({ clientName: "Match CV" })
      })
    );
    expect(loginHistoryService.recordAppSignIn).not.toHaveBeenCalled();
  });

  it("records nothing when prompt=none finds no session", async () => {
    const { service, loginHistoryService } = setup({ session: null });

    await expect(
      service.authorize(reqWith({ ...freshQuery, prompt: "none" }))
    ).rejects.toBeInstanceOf(OAuthError);
    await flush();

    expect(loginHistoryService.recordAppSignIn).not.toHaveBeenCalled();
    expect(loginHistoryService.recordAppSignInDenied).not.toHaveBeenCalled();
  });

  it("records nothing when sending the user to the login page", async () => {
    const { service, loginHistoryService } = setup({ session: null });

    const outcome = await service.authorize(reqWith(freshQuery));
    await flush();

    expect(outcome.kind).toBe("login");
    expect(loginHistoryService.recordAppSignIn).not.toHaveBeenCalled();
  });

  it("still redirects when the audit lookup fails", async () => {
    const { service, loginHistoryService, userService } = setup();
    (userService.findByAuthId as jest.Mock).mockRejectedValue(
      new Error("mongo down")
    );

    const outcome = await service.authorize(reqWith(freshQuery));
    await flush();

    expect(outcome.kind).toBe("redirect");
    expect(loginHistoryService.recordAppSignIn).not.toHaveBeenCalled();
  });

  it("records the app as recently used when a code is issued", async () => {
    const { service, recentAppService } = setup();

    await service.authorize(reqWith(freshQuery));
    await flush();

    expect(recentAppService.record).toHaveBeenCalledWith(
      USER_ID,
      "64b7f0c2f1a2b3c4d5e6f7c1"
    );
  });

  it("does not record a recently used app for a denied sign-in", async () => {
    const { service, recentAppService } = setup({
      client: makeClient({ requiredRoles: ["admin"] } as never)
    });

    await expect(service.authorize(reqWith(freshQuery))).rejects.toBeInstanceOf(
      OAuthError
    );
    await flush();

    expect(recentAppService.record).not.toHaveBeenCalled();
  });

  it("still redirects when recording the recent app fails", async () => {
    const { service, recentAppService } = setup();
    (recentAppService.record as jest.Mock).mockRejectedValue(
      new Error("mongo down")
    );

    const outcome = await service.authorize(reqWith(freshQuery));
    await flush();

    expect(outcome.kind).toBe("redirect");
  });
});
