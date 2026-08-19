// types
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const HeroTitle = ({
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
      "text-foreground text-3xl font-bold tracking-tight md:text-4xl",
      className
    )}
  >
    {children}
  </h1>
);

export default HeroTitle;
