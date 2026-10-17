// types
import type { ReactNode } from "react";
// layouts
import AdminGuardLayout from "@/layouts/AdminGuardLayout";
import AdminLayout from "@/layouts/AdminLayout";

export default function Layout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AdminGuardLayout>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuardLayout>
  );
}
