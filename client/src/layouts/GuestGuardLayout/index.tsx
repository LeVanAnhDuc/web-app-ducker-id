"use client";

// libs
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
// types
import type { ReactNode } from "react";
// components
import LoadingScreen from "@/components/LoadingScreen";
// stores
import { useAuthStore } from "@/stores";
// others
import CONSTANTS from "@/constants";
import { isTokenExpired } from "@/utils";

const { HOME } = CONSTANTS.ROUTES;

const GuestGuardLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const tokens = useAuthStore((state) => state.tokens);

  const isAuthenticated = !!tokens && !isTokenExpired(tokens.accessToken);

  useEffect(() => {
    if (isAuthenticated) router.replace(HOME);
  }, [isAuthenticated, router]);

  if (isAuthenticated) return <LoadingScreen />;

  return <>{children}</>;
};

export default GuestGuardLayout;
