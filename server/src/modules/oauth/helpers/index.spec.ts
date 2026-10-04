// libs
import crypto from "crypto";
// others
import {
  buildRedirectUrl,
  filterClaimsByScopes,
  isValidRedirectUri,
  matchRedirectUri,
  parseScopeParam,
  resolveGrantedScopes,
  verifyPkceChallenge
} from "./index";

const challengeFor = (verifier: string): string =>
  crypto.createHash("sha256").update(verifier, "ascii").digest("base64url");

describe("verifyPkceChallenge", () => {
  const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

  it("accepts the verifier that produced the challenge", () => {
    expect(verifyPkceChallenge(VERIFIER, challengeFor(VERIFIER))).toBe(true);
  });

  it("rejects a different verifier", () => {
    expect(
      verifyPkceChallenge("someone-elses-verifier", challengeFor(VERIFIER))
    ).toBe(false);
  });

  it("rejects a challenge of a different length without throwing", () => {
    // timingSafeEqual ném nếu hai buffer lệch độ dài — phải chặn trước.
    expect(verifyPkceChallenge(VERIFIER, "too-short")).toBe(false);
  });

  it("matches the RFC 7636 appendix B test vector", () => {
    expect(
      verifyPkceChallenge(
        "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
      )
    ).toBe(true);
  });
});

describe("matchRedirectUri", () => {
  const REGISTERED = ["https://app.example.com/callback"];

  it("accepts an exact match", () => {
    expect(matchRedirectUri(REGISTERED, REGISTERED[0])).toBe(true);
  });

  it("rejects a trailing-slash variant", () => {
    expect(
      matchRedirectUri(REGISTERED, "https://app.example.com/callback/")
    ).toBe(false);
  });

  it("rejects a path appended after the registered value", () => {
    // Prefix match sẽ cho lọt — đây chính là lỗ hổng mà exact match chặn.
    expect(
      matchRedirectUri(REGISTERED, "https://app.example.com/callback/../evil")
    ).toBe(false);
  });

  it("rejects an attacker host that merely contains the registered one", () => {
    expect(
      matchRedirectUri(REGISTERED, "https://app.example.com.evil.test/callback")
    ).toBe(false);
  });

  it("rejects extra query params not registered", () => {
    expect(
      matchRedirectUri(REGISTERED, "https://app.example.com/callback?next=evil")
    ).toBe(false);
  });
});

describe("isValidRedirectUri", () => {
  it.each([
    "https://levananhduc.github.io/app-calculate-badminton/",
    "http://localhost:5173/",
    "http://127.0.0.1:3000/callback"
  ])("accepts %s", (uri) => {
    expect(isValidRedirectUri(uri)).toBe(true);
  });

  it.each([
    ["plain http on a public host", "http://example.com/callback"],
    ["a fragment", "https://example.com/callback#/auth"],
    ["a wildcard", "https://*.example.com/callback"],
    ["a relative path", "/callback"],
    ["garbage", "not-a-url"]
  ])("rejects %s", (_label, uri) => {
    expect(isValidRedirectUri(uri)).toBe(false);
  });
});

describe("parseScopeParam", () => {
  it("splits on whitespace and de-duplicates", () => {
    expect(parseScopeParam("openid profile  openid email")).toEqual([
      "openid",
      "profile",
      "email"
    ]);
  });

  it("returns an empty array when absent", () => {
    expect(parseScopeParam(undefined)).toEqual([]);
  });
});

describe("resolveGrantedScopes", () => {
  it("keeps only what the client is registered for", () => {
    expect(
      resolveGrantedScopes(
        ["openid", "profile", "admin"],
        ["openid", "profile"]
      )
    ).toEqual(["openid", "profile"]);
  });
});

describe("buildRedirectUrl", () => {
  it("appends params and drops undefined ones", () => {
    const url = buildRedirectUrl("https://app.example.com/callback", {
      code: "abc",
      state: undefined
    });

    expect(url).toBe("https://app.example.com/callback?code=abc");
  });

  it("preserves a query string already present on the registered uri", () => {
    const url = buildRedirectUrl("https://app.example.com/cb?tenant=acme", {
      code: "abc"
    });

    expect(url).toContain("tenant=acme");
    expect(url).toContain("code=abc");
  });
});

describe("filterClaimsByScopes", () => {
  const CLAIMS = {
    name: "Admin User",
    picture: null,
    email: "admin@test.com",
    email_verified: true
  };

  it("returns profile claims only for scope=profile", () => {
    expect(filterClaimsByScopes(CLAIMS, ["openid", "profile"])).toEqual({
      name: "Admin User",
      picture: null
    });
  });

  it("returns nothing beyond sub when only openid is granted", () => {
    expect(filterClaimsByScopes(CLAIMS, ["openid"])).toEqual({});
  });
});
