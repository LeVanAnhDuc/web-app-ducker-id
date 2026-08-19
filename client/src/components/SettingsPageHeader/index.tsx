// libs
import type { ReactNode } from "react";

const SettingsPageHeader = ({
  title,
  description,
  actions,
  titleId
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  titleId?: string;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="flex min-w-0 flex-col gap-1.5">
      <h1
        id={titleId}
        className="text-foreground text-2xl font-bold tracking-tight"
      >
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    )}
  </div>
);

export default SettingsPageHeader;
