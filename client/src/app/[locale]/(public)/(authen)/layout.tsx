// libs
import { Suspense } from "react";
// types
import type { ReactNode } from "react";
import type { Metadata } from "next";
// ghosts
import AuthRequestCapture from "@/ghosts/AuthRequestCapture";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function AuthenLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <Suspense fallback={null}>
        <AuthRequestCapture />
      </Suspense>
      {children}
    </>
  );
}
