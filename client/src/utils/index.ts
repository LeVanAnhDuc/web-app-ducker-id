// libs
import { formatDistanceToNow } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { toast } from "sonner";
// types
import type { Locale } from "next-intl";
import type { DateTimeVariant, DateTimeValue } from "@/types/DateTime";
import type {
  LoginHistoryStatus,
  LoginHistoryMethod
} from "@/types/LoginHistory";
import type { ContactStatus } from "@/types/ContactAdmin";
import type { AdminUser } from "@/types/AdminUsers";
import type { WebApp } from "@/types/AdminApps";
import type {
  EntitlementChange,
  EntitlementMatrixFormValues
} from "@/types/AdminEntitlements";
import type { MyProfileResponse } from "@/types/User";
import type { UpdatePersonalInfoFormValues } from "@/types/UpdatePersonalInfo";
import type { LeafKeyOf, Messages } from "@/types/libs";
import type { ColumnAlign, ColumnBreakpoint } from "@/types/CustomTable";
// dataSources
import { CATEGORY_LABEL_KEY } from "@/dataSources/Categories";
// others
import CONSTANTS from "@/constants";
import { COLUMN_BREAKPOINT } from "@/constants/list";
import { defaultLocale, locales } from "@/i18n/config";

const { CALLBACK_URL } = CONSTANTS.STORAGE_KEYS;

export const getInitials = (fullName: string): string =>
  fullName
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const getDateOfBirthBounds = () => {
  const { MIN_AGE, MAX_AGE } = CONSTANTS.SIGNUP.AGE_VALIDATION;
  const today = new Date();
  const maxDate = new Date(
    today.getFullYear() - MIN_AGE,
    today.getMonth(),
    today.getDate()
  );
  const minDate = new Date(
    today.getFullYear() - MAX_AGE,
    today.getMonth(),
    today.getDate()
  );
  return { minDate, maxDate };
};

export const confirmErrorToast = (message: string): Promise<void> =>
  new Promise((resolve) => {
    toast.error(message, {
      duration: Infinity,
      action: {
        label: "OK",
        onClick: () => resolve()
      }
    });
  });

export const errorToast = (message: string) => toast.error(message);

export const getCurrentLocale = (): Locale => {
  try {
    const pathname = window.location.pathname;
    const localeMatch = pathname.match(/\/([^/]+)/);
    const locale = localeMatch?.[1] as Locale;

    return locales.includes(locale) ? locale : defaultLocale;
  } catch {
    return defaultLocale;
  }
};

const INVALID_DATE_DISPLAY = "—";

const DATE_LONG_OPTS: Intl.DateTimeFormatOptions = { dateStyle: "long" };
const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short"
};

export const toValidDate = (value: DateTimeValue): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (
  value: DateTimeValue,
  variant: DateTimeVariant,
  locale: Locale,
  options?: { timeZone?: string }
): string => {
  const date = toValidDate(value);
  if (!date) return INVALID_DATE_DISPLAY;

  if (variant === "relative") {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === "vi" ? vi : enUS
    });
  }

  const intlOptions = variant === "dateLong" ? DATE_LONG_OPTS : DATETIME_OPTS;
  return new Intl.DateTimeFormat(locale, {
    ...intlOptions,
    ...(options?.timeZone ? { timeZone: options.timeZone } : {})
  }).format(date);
};

export const parseDownloads = (downloads: string): number => {
  const num = parseInt(downloads.replace(/[^0-9]/g, ""), 10);
  if (downloads.includes("K")) return num * 1000;
  if (downloads.includes("M")) return num * 1000000;
  return num;
};

export function getTokenExpSeconds(token: string): number | null {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function saveCallbackUrl(url: string) {
  sessionStorage.setItem(CALLBACK_URL, url);
}

export function popCallbackUrl(): string | null {
  const url = sessionStorage.getItem(CALLBACK_URL);
  if (url) sessionStorage.removeItem(CALLBACK_URL);
  return url;
}

export const parseLocalDate = (iso: string): Date => {
  const [year, month, day] = iso.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const formatYmdLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const LOGIN_HISTORY_STATUSES: LoginHistoryStatus[] =
  CONSTANTS.LOGIN_HISTORY.STATUS_VALUES;
const LOGIN_HISTORY_METHODS: LoginHistoryMethod[] =
  CONSTANTS.LOGIN_HISTORY.METHOD_VALUES;
const CONTACT_STATUSES: ContactStatus[] = Object.values(
  CONSTANTS.CONTACT_STATUS
);

export const isLoginHistoryStatus = (
  value: string | null
): value is LoginHistoryStatus =>
  value !== null && (LOGIN_HISTORY_STATUSES as string[]).includes(value);

export const isLoginHistoryMethod = (
  value: string | null
): value is LoginHistoryMethod =>
  value !== null && (LOGIN_HISTORY_METHODS as string[]).includes(value);

const { LOCATION_SENTINEL } = CONSTANTS.LOGIN_HISTORY;
const LOGIN_LOCATION_SENTINELS: string[] = Object.values(LOCATION_SENTINEL);

export const formatLoginLocation = (
  city: string,
  country: string,
  t: (key: LeafKeyOf<Messages["loginHistory"]["location"]>) => string
): string => {
  const countryLabel =
    country === LOCATION_SENTINEL.LOCAL
      ? t("local")
      : country === LOCATION_SENTINEL.UNKNOWN
        ? t("unknown")
        : country;
  if (LOGIN_LOCATION_SENTINELS.includes(city)) {
    return countryLabel;
  }
  return `${city}, ${countryLabel}`;
};

export const isContactStatus = (value: string | null): value is ContactStatus =>
  value !== null && (CONTACT_STATUSES as string[]).includes(value);

export const buildPaginationPageNumbers = (
  page: number,
  totalPages: number
): (number | "dots")[] => {
  if (totalPages <= 5)
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  const result: (number | "dots")[] = [1];
  if (page > 3) result.push("dots");
  const middleStart = Math.max(2, page - 1);
  const middleEnd = Math.min(totalPages - 1, page + 1);
  for (let i = middleStart; i <= middleEnd; i += 1) result.push(i);
  if (page < totalPages - 2) result.push("dots");
  result.push(totalPages);
  return result;
};

type CategoryKey = keyof Messages["common"]["categories"];
type CategoryTranslator = (key: CategoryKey) => string;

export const resolveCategoryLabel = (
  t: CategoryTranslator,
  slug: string,
  fallback: string
): string => {
  const key = CATEGORY_LABEL_KEY[slug] as CategoryKey | undefined;
  return key ? t(key) : fallback;
};

export const mapProfileToFormValues = (
  profile: MyProfileResponse
): UpdatePersonalInfoFormValues => {
  const [firstName, ...rest] = profile.fullName.split(" ");
  return {
    firstName: firstName ?? "",
    lastName: rest.join(" "),
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    dateOfBirth: profile.dateOfBirth
      ? profile.dateOfBirth.substring(0, 10)
      : "",
    gender: profile.gender ?? ""
  };
};

/**
 * Thay placeholder `:param` trong template endpoint bằng giá trị thực (kiểu react-router).
 * `generatePath("/posts/:id/comments/:commentId", { id: 123, commentId: 456 })`
 *   → `/posts/123/comments/456`
 * Throw khi thiếu param; encode từng giá trị bằng encodeURIComponent.
 */
export const generatePath = (
  template: string,
  params: Record<string, string | number> = {}
): string =>
  template.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
    const value = params[key];
    if (value === undefined || value === null) {
      throw new Error(`generatePath: missing param "${key}" for "${template}"`);
    }
    return encodeURIComponent(String(value));
  });

export const alignClass = (align?: ColumnAlign) =>
  align === "center"
    ? "text-center"
    : align === "right"
      ? "text-right"
      : "text-left";

export const hideBelowClass = (breakpoint?: ColumnBreakpoint): string => {
  switch (breakpoint) {
    case COLUMN_BREAKPOINT.SM:
      return "hidden sm:table-cell";
    case COLUMN_BREAKPOINT.MD:
      return "hidden md:table-cell";
    case COLUMN_BREAKPOINT.LG:
      return "hidden lg:table-cell";
    default:
      return "";
  }
};

export const isAppEligibleForUser = (user: AdminUser, app: WebApp): boolean =>
  app.requiredRoles.length === 0 || app.requiredRoles.includes(user.role);

export const buildEntitlementDefaults = (
  users: AdminUser[],
  apps: WebApp[],
  grantsByUser: Record<string, string[]>
): EntitlementMatrixFormValues => {
  const grants: Record<string, Record<string, boolean>> = {};
  users.forEach((user) => {
    const grantedAppIds = grantsByUser[user._id] ?? [];
    grants[user._id] = {};
    apps.forEach((app) => {
      grants[user._id][app._id] = grantedAppIds.includes(app._id);
    });
  });
  return { grants };
};

export const diffEntitlementGrants = (
  values: EntitlementMatrixFormValues,
  defaults: EntitlementMatrixFormValues
): EntitlementChange[] => {
  const changes: EntitlementChange[] = [];
  Object.entries(values.grants).forEach(([userId, appGrants]) => {
    Object.entries(appGrants).forEach(([appId, granted]) => {
      if (defaults.grants[userId]?.[appId] !== granted) {
        changes.push({ userId, appId, granted });
      }
    });
  });
  return changes;
};
