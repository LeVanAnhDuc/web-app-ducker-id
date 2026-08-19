// types
import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function AuthenLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
