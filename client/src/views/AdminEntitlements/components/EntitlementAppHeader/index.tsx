"use client";

// types
import type { WebApp } from "@/types/AdminApps";
// components
import CustomImage from "@/components/CustomImage";
import RoleChip from "@/views/AdminApps/components/RoleChip";

const EntitlementAppHeader = ({ app }: { app: WebApp }) => (
  <div className="flex flex-col items-center gap-1.5 py-1">
    <span
      className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl text-sm font-semibold"
      aria-hidden="true"
    >
      {app.iconUrl ? (
        <CustomImage
          src={app.iconUrl}
          alt=""
          width={36}
          height={36}
          className="size-full object-cover"
        />
      ) : (
        app.displayName.charAt(0).toUpperCase()
      )}
    </span>
    <span
      className="text-foreground max-w-20 text-center text-xs leading-tight font-semibold"
      title={app.displayName}
    >
      {app.displayName}
    </span>
    {app.requiredRoles.length > 0 && (
      <div className="flex flex-wrap justify-center gap-1">
        {app.requiredRoles.map((role) => (
          <RoleChip key={role} role={role} />
        ))}
      </div>
    )}
  </div>
);

export default EntitlementAppHeader;
