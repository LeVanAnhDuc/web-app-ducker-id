"use client";

// hooks
import useHasMounted from "./useHasMounted";

/**
 * The viewer's IANA zone, for endpoints that group rows by calendar day.
 *
 * Undefined until mount: the server has no way to know the browser's zone, so
 * reading it during the first render would make the markup disagree with the
 * client. Callers keep the query disabled while it is undefined rather than
 * sending a guess and re-cutting every bucket a moment later.
 */
const useBrowserTimeZone = (): string | undefined => {
  const mounted = useHasMounted();
  if (!mounted) return undefined;

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

export default useBrowserTimeZone;
