// libs
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
// types
import type { Request } from "express";
import type {
  ClientType,
  DeviceType,
  LoginHistoryAdminQuery,
  LoginHistoryFilter
} from "@/modules/login-history/types";
// modules
import {
  CLIENT_TYPES,
  DEVICE_TYPES,
  GEO_DEFAULTS,
  USER_AGENT_DEFAULTS,
  LOCALHOST_VALUES,
  PRIVATE_IP_PATTERNS
} from "@/modules/login-history/constants";
// others
import { Logger } from "@/libs/logger";

const IPV4_MAPPED_PREFIX = "::ffff:";
const IPV6_LOOPBACK = "::1";
const IPV4_LOOPBACK = "127.0.0.1";

export const normalizeIp = (ip: string): string => {
  if (!ip) return ip;
  let normalized = ip.trim();
  if (normalized.startsWith(IPV4_MAPPED_PREFIX)) {
    normalized = normalized.slice(IPV4_MAPPED_PREFIX.length);
  }
  if (normalized === IPV6_LOOPBACK) {
    normalized = IPV4_LOOPBACK;
  }
  return normalized;
};

const isPrivateOrLocalIp = (ip: string): boolean => {
  const isPrivate = PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
  const isLocalhost = LOCALHOST_VALUES.includes(
    ip as (typeof LOCALHOST_VALUES)[number]
  );
  return isPrivate || isLocalhost;
};

export const extractIp = (req: Request): string => {
  const rawIp = req.ip || req.socket.remoteAddress || GEO_DEFAULTS.UNKNOWN_IP;
  return normalizeIp(rawIp);
};

// ──────────────────────────────────────────────
// parseUserAgent
// ──────────────────────────────────────────────

const MOBILE_DEVICE_TYPE = "mobile";
const TABLET_DEVICE_TYPE = "tablet";

const mapDeviceType = (deviceType?: string): DeviceType => {
  if (!deviceType) {
    return DEVICE_TYPES.DESKTOP;
  }

  const type = deviceType.toLowerCase();

  if (type === MOBILE_DEVICE_TYPE) return DEVICE_TYPES.MOBILE;
  if (type === TABLET_DEVICE_TYPE) return DEVICE_TYPES.TABLET;

  return DEVICE_TYPES.DESKTOP;
};

export const parseUserAgent = (
  userAgent: string
): {
  deviceType: DeviceType;
  os: string;
  browser: string;
} => {
  try {
    if (!userAgent || userAgent.trim().length === 0) {
      return {
        deviceType: DEVICE_TYPES.UNKNOWN,
        os: USER_AGENT_DEFAULTS.UNKNOWN_OS,
        browser: USER_AGENT_DEFAULTS.UNKNOWN_BROWSER
      };
    }

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const deviceType = mapDeviceType(result.device.type);
    const os = result.os.name || USER_AGENT_DEFAULTS.UNKNOWN_OS;
    const browser = result.browser.name || USER_AGENT_DEFAULTS.UNKNOWN_BROWSER;

    const osVersion = result.os.version ? ` ${result.os.version}` : "";
    const browserVersion = result.browser.version
      ? ` ${result.browser.version}`
      : "";

    return {
      deviceType,
      os: `${os}${osVersion}`,
      browser: `${browser}${browserVersion}`
    };
  } catch {
    return {
      deviceType: DEVICE_TYPES.UNKNOWN,
      os: USER_AGENT_DEFAULTS.UNKNOWN_OS,
      browser: USER_AGENT_DEFAULTS.UNKNOWN_BROWSER
    };
  }
};

// ──────────────────────────────────────────────
// geoipLookup
// ──────────────────────────────────────────────

export const geoipLookup = (
  ip: string
): {
  country: string;
  city: string;
} => {
  try {
    if (!ip || ip.trim().length === 0) {
      return {
        country: GEO_DEFAULTS.UNKNOWN_COUNTRY,
        city: GEO_DEFAULTS.UNKNOWN_CITY
      };
    }

    if (isPrivateOrLocalIp(ip)) {
      return {
        country: GEO_DEFAULTS.LOCAL,
        city: GEO_DEFAULTS.LOCAL
      };
    }

    const geo = geoip.lookup(ip);

    if (!geo) {
      Logger.debug("GeoIP lookup returned no result", { ip });
      return {
        country: GEO_DEFAULTS.UNKNOWN_COUNTRY,
        city: GEO_DEFAULTS.UNKNOWN_CITY
      };
    }

    return {
      country: geo.country || GEO_DEFAULTS.UNKNOWN_COUNTRY,
      city: geo.city || GEO_DEFAULTS.UNKNOWN_CITY
    };
  } catch (error) {
    Logger.warn("GeoIP lookup failed", { ip, error });
    return {
      country: GEO_DEFAULTS.UNKNOWN_COUNTRY,
      city: GEO_DEFAULTS.UNKNOWN_CITY
    };
  }
};

// ──────────────────────────────────────────────
// maskIp
// ──────────────────────────────────────────────

const IPV4_PARTS = 4;
const IPV4_KEEP_PARTS = 2;
const IPV6_MIN_PARTS = 4;
const IPV6_KEEP_PARTS = 3;

export const maskIp = (rawIp: string): string => {
  const ip = normalizeIp(rawIp);

  if (isPrivateOrLocalIp(ip)) {
    return ip;
  }

  const ipv4Parts = ip.split(".");
  if (ipv4Parts.length === IPV4_PARTS) {
    return `${ipv4Parts.slice(0, IPV4_KEEP_PARTS).join(".")}.*.*`;
  }

  const ipv6Parts = ip.split(":");
  if (ipv6Parts.length >= IPV6_MIN_PARTS) {
    return `${ipv6Parts.slice(0, IPV6_KEEP_PARTS).join(":")}:*:*:*:*:*`;
  }

  return ip;
};

// ──────────────────────────────────────────────
// determineClientType
// ──────────────────────────────────────────────

export const determineClientType = (clientTypeHeader?: string): ClientType => {
  if (!clientTypeHeader) {
    return CLIENT_TYPES.WEB;
  }

  const type = clientTypeHeader.toLowerCase();

  if (type === "mobile_ios" || type === "ios") return CLIENT_TYPES.MOBILE_IOS;
  if (type === "mobile_android" || type === "android")
    return CLIENT_TYPES.MOBILE_ANDROID;

  return CLIENT_TYPES.WEB;
};

// ──────────────────────────────────────────────
// buildLoginHistoryFilter
// ──────────────────────────────────────────────

export const buildLoginHistoryFilter = (
  query: LoginHistoryAdminQuery,
  userId?: string
): LoginHistoryFilter => {
  const filter: LoginHistoryFilter = {};

  if (userId) filter.userId = userId;
  else if (query.userId) filter.userId = query.userId;

  if (query.status) filter.status = query.status;
  if (query.method) filter.method = query.method;
  if (query.deviceType) filter.deviceType = query.deviceType;
  if (query.clientType) filter.clientType = query.clientType;
  if (query.country) filter.country = query.country;
  if (query.city) filter.city = query.city;
  if (query.os) filter.os = query.os;
  if (query.browser) filter.browser = query.browser;
  if (query.ip) filter.ip = query.ip;
  if (query.fromDate) filter.fromDate = new Date(query.fromDate);
  if (query.toDate) filter.toDate = new Date(query.toDate);

  return filter;
};
