// types
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const SectionHeading = ({
  children,
  id,
  className
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) => (
  <h2 id={id} className={cn("text-foreground text-xl font-bold", className)}>
    {children}
  </h2>
);

export default SectionHeading;
