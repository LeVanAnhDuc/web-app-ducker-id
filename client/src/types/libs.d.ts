import type { MessageKeys, NestedKeyOf } from "next-intl";
import type { routing } from "@/i18n/routing";
import type { formats } from "@/i18n/request";
import type messages from "@/locales/en/index";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
    Formats: typeof formats;
  }
}

// Export inferred message types for reuse
export type Messages = typeof messages;
export type LoginMessages = Messages["login"];
export type SignupMessages = Messages["signup"];
export type ForgotPasswordMessages = Messages["forgotPassword"];
export type ForgotPasswordResetMessages = Messages["forgotPasswordReset"];
export type ContactAdminMessages = Messages["contactAdmin"];
export type LoginHistoryMessages = Messages["loginHistory"];
export type AdminUsersMessages = Messages["adminUsers"];
export type AdminAppsMessages = Messages["adminApps"];
export type AdminEntitlementsMessages = Messages["adminEntitlements"];

// Leaf-key union of a message object — matches exactly the keys a translator `t`
// accepts (excludes intermediate namespace paths). Use to type any param that
// receives a scoped `t`: `t: (key: LeafKeyOf<Messages["ns"]>) => string`.
export type LeafKeyOf<M> = MessageKeys<M, NestedKeyOf<M>>;
