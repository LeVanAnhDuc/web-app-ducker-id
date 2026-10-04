// libs
import { BookOpen } from "lucide-react";
// types
import type { LoginHistoryApp } from "@/types/LoginHistory";
// components
import CustomImage from "@/components/CustomImage";
import CustomBadge from "@/components/CustomBadge";
// others
import { cn } from "@/libs/utils";

const ICON_SIZE = 20;

/**
 * Where a login-history row signed into: Ducker ID itself (`app = null`) or a
 * satellite app. Silent SSO rows carry a small badge so they read apart from
 * logins the user typed credentials for.
 */
const LoginAppLabel = ({
  app,
  interactive,
  idpLabel,
  silentLabel,
  className
}: {
  app: LoginHistoryApp | null;
  interactive: boolean;
  idpLabel: string;
  silentLabel: string;
  className?: string;
}) => {
  const name = app ? app.name : idpLabel;

  const icon = !app ? (
    <BookOpen className="size-3" />
  ) : app.iconUrl ? (
    <CustomImage
      src={app.iconUrl}
      alt=""
      width={ICON_SIZE}
      height={ICON_SIZE}
      className="size-full object-cover"
    />
  ) : (
    name.charAt(0).toUpperCase()
  );

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center overflow-hidden rounded text-[10px] font-semibold",
          app
            ? "bg-primary/10 text-primary"
            : "bg-primary text-primary-foreground"
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="truncate font-medium">{name}</span>
      {!interactive && (
        <CustomBadge variant="secondary" className="shrink-0 text-[10px]">
          {silentLabel}
        </CustomBadge>
      )}
    </span>
  );
};

export default LoginAppLabel;
