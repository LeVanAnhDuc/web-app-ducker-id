"use client";

// libs
import { useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
// types
import type { ReactNode } from "react";
// ghosts
import TokenRefresher from "@/ghosts/TokenRefresher";
import MustChangePasswordGate from "./ghosts/MustChangePasswordGate";
// stores
import { useAuthStore } from "@/stores";
// others
import CONSTANTS from "@/constants";
import { isTokenExpired, saveCallbackUrl } from "@/utils";

const { LOGIN } = CONSTANTS.ROUTES;

const AuthGuardLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const tokens = useAuthStore((state) => state.tokens);

  const shouldRedirect = !tokens || isTokenExpired(tokens.accessToken);

  useEffect(() => {
    if (shouldRedirect) {
      saveCallbackUrl(pathname);
      router.replace(LOGIN);
    }
  }, [shouldRedirect, router, pathname]);

  if (shouldRedirect) return null;

  return (
    <>
      <TokenRefresher />
      <MustChangePasswordGate />
      {children}
    </>
  );
};

export default AuthGuardLayout;
