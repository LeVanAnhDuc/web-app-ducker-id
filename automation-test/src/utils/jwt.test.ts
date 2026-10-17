import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import {
  fakeJwt,
  jwtHeader,
  jwtPayload,
  tamperSignature,
  verifyRs256,
  withClaims,
  type Jwk
} from "./jwt";

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

test("jwtPayload decodes the middle segment without verifying the signature", () => {
  const payload = { sub: "42", roles: "user", email: "ü@test.com" };
  const jwt = `${encode({ alg: "HS256" })}.${encode(payload)}.not-a-signature`;
  expect(jwtPayload<typeof payload>(jwt)).toEqual(payload);
});

test("jwtPayload reads base64url (no padding, - and _)", () => {
  // "???" and ">>>" encode to "Pz8_" / "Pj4-" in base64url.
  const jwt = `x.${encode({ q: "???>>>" })}.y`;
  expect(jwt).toMatch(/[-_]/);
  expect(jwtPayload<{ q: string }>(jwt).q).toBe("???>>>");
});

test("jwtPayload throws on a token with no payload segment", () => {
  expect(() => jwtPayload("not-a-jwt")).toThrow();
});

test("fakeJwt builds an unsigned token whose payload jwtPayload reads back", () => {
  const payload = { sub: "1", mustChangePassword: true, exp: 2_000_000_000 };
  const jwt = fakeJwt(payload);
  expect(jwt.split(".")).toHaveLength(3);
  expect(jwt).not.toMatch(/=/);
  expect(jwtPayload(jwt)).toEqual(payload);
  expect(jwtPayload(`${jwt.split(".")[0]}.${jwt.split(".")[0]}.x`)).toEqual({
    alg: "none",
    typ: "JWT"
  });
});

test("jwtHeader decodes the first segment", () => {
  const jwt = `${encode({ alg: "RS256", kid: "k1" })}.${encode({})}.sig`;
  expect(jwtHeader(jwt)).toEqual({ alg: "RS256", kid: "k1" });
});

test("verifyRs256 accepts a token signed by the key and refuses a tampered one", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048
  });
  const signingInput = `${encode({ alg: "RS256", kid: "k1" })}.${encode({ sub: "1" })}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signingInput), privateKey)
    .toString("base64url");
  const jwt = `${signingInput}.${signature}`;
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1" } as Jwk;

  expect(verifyRs256(jwt, jwk)).toBe(true);
  expect(tamperSignature(jwt)).not.toBe(jwt);
  expect(verifyRs256(tamperSignature(jwt), jwk)).toBe(false);
  expect(verifyRs256("not-a-jwt", jwk)).toBe(false);
});

test("withClaims rewrites the payload and keeps header and signature", () => {
  const jwt = `${encode({ alg: "RS256" })}.${encode({ sub: "1", roles: "user" })}.sig-AbC`;
  const edited = withClaims(jwt, { roles: "admin" });
  const [h, , s] = edited.split(".");
  expect(h).toBe(jwt.split(".")[0]);
  expect(s).toBe("sig-AbC");
  expect(jwtPayload(edited)).toEqual({ sub: "1", roles: "admin" });
});
