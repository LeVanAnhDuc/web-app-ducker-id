// types
import type { ReactNode } from "react";
// components
import PublicLayout from "@/layouts/PublicLayout";
import GuestGuardLayout from "@/layouts/GuestGuardLayout";

export default function Layout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <GuestGuardLayout>
      <PublicLayout>{children}</PublicLayout>;
    </GuestGuardLayout>
  );
}
