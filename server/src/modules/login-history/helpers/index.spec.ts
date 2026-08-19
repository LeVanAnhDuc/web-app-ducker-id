// libs
import type { Request } from "express";
// module under test
import { normalizeIp, extractIp, geoipLookup, maskIp } from "./index";

jest.mock("geoip-lite", () => ({ lookup: jest.fn() }));
import geoip from "geoip-lite";

const makeReq = (ip?: string, remoteAddress?: string): Request =>
  ({ ip, socket: { remoteAddress } }) as unknown as Request;

describe("normalizeIp", () => {
  it("strips IPv4-mapped IPv6 prefix", () => {
    expect(normalizeIp("::ffff:1.2.3.4")).toBe("1.2.3.4");
  });
  it("maps IPv6 loopback to IPv4 loopback", () => {
    expect(normalizeIp("::1")).toBe("127.0.0.1");
  });
  it("leaves a plain IPv4 untouched", () => {
    expect(normalizeIp("1.2.3.4")).toBe("1.2.3.4");
  });
});

describe("extractIp", () => {
  it("prefers req.ip and normalizes it", () => {
    expect(extractIp(makeReq("::ffff:8.8.8.8"))).toBe("8.8.8.8");
  });
  it("maps ::1 from req.ip to 127.0.0.1", () => {
    expect(extractIp(makeReq("::1"))).toBe("127.0.0.1");
  });
  it("falls back to socket.remoteAddress when req.ip is empty", () => {
    expect(extractIp(makeReq(undefined, "10.0.0.5"))).toBe("10.0.0.5");
  });
  it("returns UNKNOWN when no source available", () => {
    expect(extractIp(makeReq(undefined, undefined))).toBe("UNKNOWN");
  });
});

describe("geoipLookup", () => {
  it("returns LOCAL for loopback/private IPs", () => {
    expect(geoipLookup("127.0.0.1")).toEqual({
      country: "LOCAL",
      city: "LOCAL"
    });
    expect(geoipLookup("192.168.1.10")).toEqual({
      country: "LOCAL",
      city: "LOCAL"
    });
  });
  it("returns country/city when geoip resolves a public IP", () => {
    (geoip.lookup as jest.Mock).mockReturnValueOnce({
      country: "VN",
      city: "Hanoi"
    });
    expect(geoipLookup("203.0.113.45")).toEqual({
      country: "VN",
      city: "Hanoi"
    });
  });
  it("returns UNKNOWN when geoip has no result for a public IP", () => {
    (geoip.lookup as jest.Mock).mockReturnValueOnce(null);
    expect(geoipLookup("203.0.113.45")).toEqual({
      country: "UNKNOWN",
      city: "UNKNOWN"
    });
  });
});

describe("maskIp", () => {
  it("shows loopback/private IPs in full (not sensitive)", () => {
    expect(maskIp("127.0.0.1")).toBe("127.0.0.1");
    expect(maskIp("::1")).toBe("127.0.0.1");
    expect(maskIp("10.0.0.5")).toBe("10.0.0.5");
  });
  it("masks the last two octets of a public IPv4", () => {
    expect(maskIp("203.0.113.45")).toBe("203.0.*.*");
  });
  it("masks a public IPv4 delivered as IPv4-mapped IPv6", () => {
    expect(maskIp("::ffff:8.8.8.8")).toBe("8.8.*.*");
  });
  it("masks the tail of a public IPv6", () => {
    expect(maskIp("2001:db8:85a3:0:0:8a2e:370:7334")).toBe(
      "2001:db8:85a3:*:*:*:*:*"
    );
  });
});
