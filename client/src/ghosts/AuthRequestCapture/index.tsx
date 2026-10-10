"use client";

// libs
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
// others
import { saveAuthRequestAppName, saveAuthRequestId } from "@/utils";

const AuthRequestCapture = () => {
  const searchParams = useSearchParams();
  const authRequestId = searchParams.get("auth_req");
  const appName = searchParams.get("app");

  useEffect(() => {
    if (!authRequestId) return;
    saveAuthRequestId(authRequestId);
    if (appName) saveAuthRequestAppName(appName);
  }, [authRequestId, appName]);

  return null;
};

export default AuthRequestCapture;
