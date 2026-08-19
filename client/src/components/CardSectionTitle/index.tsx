// types
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const CardSectionTitle = ({
  children,
  id,
  className
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) => (
  <h3
    id={id}
    className={cn(
      "text-foreground text-base leading-none font-semibold",
      className
    )}
  >
    {children}
  </h3>
);

export default CardSectionTitle;
