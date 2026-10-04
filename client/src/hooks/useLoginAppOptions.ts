// libs
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
// types
import type { LoginAppOption } from "@/dataSources/LoginHistory";
// requests
import { getApps } from "@/requests/apps";

// The catalog is small; one page at the API's max limit covers it.
const LOGIN_APP_OPTIONS_LIMIT = 100;

/** Catalog apps offered by the login-history "app" filter. */
const useLoginAppOptions = (): LoginAppOption[] => {
  const { data } = useQuery({
    queryKey: ["apps", { limit: LOGIN_APP_OPTIONS_LIMIT }],
    queryFn: () => getApps({ limit: LOGIN_APP_OPTIONS_LIMIT }),
    staleTime: 5 * 60 * 1000
  });

  return useMemo(
    () =>
      (data?.items ?? []).map((app) => ({
        id: app._id,
        name: app.displayName
      })),
    [data]
  );
};

export default useLoginAppOptions;
