// types
import type { LucideIcon } from "lucide-react";
// components
import { Card } from "@/components/ui/card";
// others
import { cn } from "@/libs/utils";

const LoginStatCard = ({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone: "neutral" | "success" | "danger" | "info";
}) => (
  <Card
    role="group"
    aria-label={`${label}: ${value}`}
    className={cn(
      "flex flex-row items-center gap-4 rounded-xl p-5",
      tone === "neutral" && "border-border bg-card",
      tone === "success" && "border-success/30 bg-success/10",
      tone === "danger" && "border-destructive/30 bg-destructive/10",
      tone === "info" && "border-info/30 bg-info/10"
    )}
  >
    <div
      className={cn(
        "flex size-11 items-center justify-center rounded-xl",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-success/15 text-success",
        tone === "danger" && "bg-destructive/15 text-destructive",
        tone === "info" && "bg-info/15 text-info"
      )}
      aria-hidden="true"
    >
      <Icon className="size-5" />
    </div>
    <div className="flex flex-col gap-0.5" aria-hidden="true">
      <span
        className={cn(
          "text-2xl font-bold",
          tone === "neutral" && "text-foreground",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
          tone === "info" && "text-info"
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "text-xs font-medium",
          tone === "neutral" && "text-muted-foreground",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
          tone === "info" && "text-info"
        )}
      >
        {label}
      </span>
    </div>
  </Card>
);

export default LoginStatCard;
