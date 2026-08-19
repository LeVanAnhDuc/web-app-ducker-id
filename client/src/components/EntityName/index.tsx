// types
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const EntityName = ({
  children,
  id,
  className
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) => (
  <h2
    id={id}
    className={cn("text-foreground text-lg font-semibold", className)}
  >
    {children}
  </h2>
);

export default EntityName;
