// types
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const PageTitle = ({
  children,
  id,
  className
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) => (
  <h1
    id={id}
    className={cn(
      "text-foreground text-2xl font-bold tracking-tight",
      className
    )}
  >
    {children}
  </h1>
);

export default PageTitle;
