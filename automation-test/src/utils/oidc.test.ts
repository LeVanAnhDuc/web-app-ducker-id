import { test, expect } from "@playwright/test";
import { OIDC_REDIRECT_URI } from "@/data/test-data";
import {
  authorizePath,
  authRequest,
  basicAuth,
  challengeFor,
  isAt,
  makeVerifier,
  param
} from "./oidc";

test("makeVerifier returns exactly `length` RFC 7636 unreserved characters", () => {
  for (const length of [42, 43, 128, 129]) {
    const v = makeVerifier(length);
    expect(v).toHaveLength(length);
    expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/);
  }
});

test("challengeFor is BASE64URL(SHA256(verifier)) — RFC 7636 appendix B", () => {
  expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  );
});

test("authRequest builds a valid S256 request and drops overrides set to undefined", () => {
  const req = authRequest({ clientId: "c1" }, { nonce: undefined });
  expect(req.params).toMatchObject({
    client_id: "c1",
    redirect_uri: OIDC_REDIRECT_URI,
    response_type: "code",
    code_challenge_method: "S256",
    code_challenge: challengeFor(req.verifier),
    state: req.state
  });
  const q = new URL(authorizePath(req.params), "https://x").searchParams;
  expect(q.has("nonce")).toBe(false);
  expect(q.get("scope")).toBe("openid profile email");
});

test("param and isAt read a redirect and tolerate none", () => {
  const at = new URL(`${OIDC_REDIRECT_URI}?code=abc&state=s`);
  expect(param(at, "code")).toBe("abc");
  expect(param(null, "code")).toBeNull();
  expect(isAt(at, OIDC_REDIRECT_URI)).toBe(true);
  expect(isAt(at, `${OIDC_REDIRECT_URI}/x`)).toBe(false);
  expect(isAt(null, OIDC_REDIRECT_URI)).toBe(false);
});

test("basicAuth url-encodes id and secret before base64", () => {
  const header = basicAuth("a:b", "s/c");
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  expect(header.startsWith("Basic ")).toBe(true);
  expect(decoded).toBe("a%3Ab:s%2Fc");
});
