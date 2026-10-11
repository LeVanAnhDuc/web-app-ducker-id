// libs
import type { Request } from "express";
// module under test
import {
  normalizeIp,
  extractIp,
  geoipLookup,
  maskIp,
  assessLoginAnomaly,
  stripVersion
} from "./index";

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

describe("assessLoginAnomaly", () => {
  const current = {
    browser: "Chrome",
    os: "Windows",
    deviceType: "DESKTOP" as const,
    country: "VN"
  };

  it.each([
    ["no history", { hasHistory: false, devices: [], countries: [] }, []],
    [
      "known device and country",
      {
        hasHistory: true,
        devices: ["Chrome|Windows|DESKTOP"],
        countries: ["VN"]
      },
      []
    ],
    [
      "new device only",
      {
        hasHistory: true,
        devices: ["Chrome|macOS|DESKTOP"],
        countries: ["VN"]
      },
      ["new_device"]
    ],
    [
      "new country only",
      {
        hasHistory: true,
        devices: ["Chrome|Windows|DESKTOP"],
        countries: ["US"]
      },
      ["new_country"]
    ],
    [
      "both new",
      { hasHistory: true, devices: [], countries: [] },
      ["new_device", "new_country"]
    ]
  ])("%s", (_label, traits, reasons) => {
    expect(assessLoginAnomaly(current, traits)).toEqual({
      isAnomaly: reasons.length > 0,
      reasons
    });
  });

  it.each(["LOCAL", "UNKNOWN", ""])(
    "never treats country %p as new",
    (country) => {
      expect(
        assessLoginAnomaly(
          { ...current, country },
          {
            hasHistory: true,
            devices: ["Chrome|Windows|DESKTOP"],
            countries: ["VN"]
          }
        )
      ).toEqual({ isAnomaly: false, reasons: [] });
    }
  );
});

describe("stripVersion", () => {
  it.each([
    ["Chrome 126.0.0.0", "Chrome"],
    ["Windows 10", "Windows"],
    ["Mac OS 10.15.7", "Mac OS"],
    ["Mobile Safari 17.4", "Mobile Safari"],
    ["UNKNOWN", "UNKNOWN"],
    ["Edge", "Edge"]
  ])("%p → %p", (input, expected) => {
    expect(stripVersion(input)).toBe(expected);
  });
});

describe("assessLoginAnomaly — versions", () => {
  it("does not flag a browser or OS update as a new device", () => {
    expect(
      assessLoginAnomaly(
        {
          browser: "Chrome 127.0.1.0",
          os: "Windows 11",
          deviceType: "DESKTOP",
          country: "VN"
        },
        {
          hasHistory: true,
          devices: ["Chrome 126.0.0.0|Windows 10|DESKTOP"],
          countries: ["VN"]
        }
      )
    ).toEqual({ isAnomaly: false, reasons: [] });
  });
});
