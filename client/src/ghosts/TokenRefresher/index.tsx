"use client";

// libs
import { useQuery } from "@tanstack/react-query";
// stores
import { useAuthStore } from "@/stores";
// requests
import { refreshToken } from "@/requests/login";
// others
import CONSTANTS from "@/constants";
import { getTokenExpSeconds } from "@/utils";

const REFRESH_BUFFER_SECONDS = 60;
const CHECK_INTERVAL_MS = 30_000;

const TokenRefresher = () => {
  const tokens = useAuthStore((state) => state.tokens);

  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.TOKEN_REFRESH],
    queryFn: async () => {
      const currentTokens = useAuthStore.getState().tokens;
      if (!currentTokens?.accessToken) return null;

      const expSeconds = getTokenExpSeconds(currentTokens.accessToken);
      if (!expSeconds) return null;

      const nowSeconds = Date.now() / 1000;
      if (expSeconds - nowSeconds >= REFRESH_BUFFER_SECONDS) return null;

      const data = await refreshToken();
      useAuthStore.getState().setTokens(data);
      return data;
    },
    enabled: !!tokens,
    refetchInterval: CHECK_INTERVAL_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0,
    retry: false
  });

  return null;
};

export default TokenRefresher;
