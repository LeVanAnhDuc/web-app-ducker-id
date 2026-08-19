// types
import type { ReactNode } from "react";
// components
import DashboardLayout from "@/layouts/DashboardLayout";

export default function Layout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
