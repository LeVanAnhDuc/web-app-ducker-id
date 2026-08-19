"use client";

// libs
import { ChevronLeft, ChevronRight } from "lucide-react";
// components
import CustomButton from "@/components/CustomButton";
import { useSidebar } from "@/components/ui/sidebar";
// others
import { cn } from "@/libs/utils";

const CustomSidebarCollapseToggle = ({
  "aria-label": ariaLabel,
  className,
  onToggle
}: {
  "aria-label": string;
  className?: string;
  onToggle?: (collapsed: boolean) => void;
}) => {
  const { state, setOpen, isMobile } = useSidebar();

  if (isMobile) return null;

  const isCollapsed = state === "collapsed";

  const handleClick = () => {
    const next = !isCollapsed;
    setOpen(!next);
    onToggle?.(next);
  };

  return (
    <CustomButton
      variant="outline"
      size="icon"
      aria-label={ariaLabel}
      className={cn(
        "bg-card hover:bg-accent absolute top-[69px] -right-3 z-10 hidden size-6 rounded-full shadow-md md:flex",
        className
      )}
      onClick={handleClick}
    >
      {isCollapsed ? (
        <ChevronRight className="size-3" aria-hidden="true" />
      ) : (
        <ChevronLeft className="size-3" aria-hidden="true" />
      )}
    </CustomButton>
  );
};

export default CustomSidebarCollapseToggle;
