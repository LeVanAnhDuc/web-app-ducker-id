// types
import type { ReactNode } from "react";
import type { Metadata } from "next";
// components
import AuthGuardLayout from "@/layouts/AuthGuardLayout";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function PrivateLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return <AuthGuardLayout>{children}</AuthGuardLayout>;
}
