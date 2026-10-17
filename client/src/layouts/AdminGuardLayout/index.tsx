"use client";

// libs
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
// types
import type { ReactNode } from "react";
// hooks
import { useUserInfo } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { HOME } = CONSTANTS.ROUTES;
const { ADMIN } = CONSTANTS.AUTHENTICATION_ROLES;

// Keeps a signed-in non-admin out of the admin shell. The API still answers
// 403 on every admin endpoint — this only stops the console from rendering.
const AdminGuardLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const userInfo = useUserInfo();
  const isAdmin = userInfo?.roles === ADMIN;

  useEffect(() => {
    if (!isAdmin) router.replace(HOME);
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  return <>{children}</>;
};

export default AdminGuardLayout;
