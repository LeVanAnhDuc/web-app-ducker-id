// types
import type { ReactNode } from "react";
// layouts
import AdminLayout from "@/layouts/AdminLayout";

export default function Layout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return <AdminLayout>{children}</AdminLayout>;
}
