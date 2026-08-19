"use client";

// types
import type { ReactNode } from "react";
// components
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

const CustomTooltip = ({
  content,
  children,
  side,
  delayDuration = 150,
  asChild
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
  asChild?: boolean;
}) => {
  if (!content) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          {asChild ? children : <span className="inline-flex">{children}</span>}
        </TooltipTrigger>
        <TooltipContent side={side}>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CustomTooltip;
