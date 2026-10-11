// libs
import { useLocale, useTranslations } from "next-intl";
// types
import type { ApiNotification } from "@/types/Notification";
// others
import { formatRegionName } from "@/utils/notifications";

/**
 * Notifications carry no text — only `type` + `params`. This renders the
 * localized title and body for the reader's locale; a country code becomes a
 * country name here, so the server never decides the language.
 */
const useNotificationText = () => {
  const t = useTranslations("notifications.types");
  const locale = useLocale();

  return ({ type, params }: Pick<ApiNotification, "type" | "params">) => {
    const values =
      typeof params.country === "string"
        ? { ...params, country: formatRegionName(params.country, locale) }
        : params;
    // Runtime key from the API's type. Every known type has a catalogue entry;
    // `t.has` covers a type newer than this build.
    const titleKey = `${type}.title` as Parameters<typeof t>[0];
    const bodyKey = `${type}.body` as Parameters<typeof t>[0];
    if (!t.has(titleKey)) return { title: type, body: "" };
    return { title: t(titleKey, values), body: t(bodyKey, values) };
  };
};

export default useNotificationText;
