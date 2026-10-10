"use client";

// libs
import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
// types
import type { ReactNode } from "react";
// components
import RedirectingScreen from "@/components/RedirectingScreen";
// stores
import { useAuthStore } from "@/stores";
// others
import CONSTANTS from "@/constants";
import { isTokenExpired, popAuthRequestId, resumeAuthorize } from "@/utils";

const { HOME } = CONSTANTS.ROUTES;

const GuestGuardLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const tokens = useAuthStore((state) => state.tokens);

  const isAuthenticated = !!tokens && !isTokenExpired(tokens.accessToken);

  const arrivedAuthenticated = useRef(isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!arrivedAuthenticated.current) return;

    const authRequestId = popAuthRequestId();

    if (authRequestId) {
      resumeAuthorize(authRequestId);
      return;
    }

    router.replace(HOME);
  }, [isAuthenticated, router]);

  if (isAuthenticated) return <RedirectingScreen />;

  return <>{children}</>;
};

export default GuestGuardLayout;
