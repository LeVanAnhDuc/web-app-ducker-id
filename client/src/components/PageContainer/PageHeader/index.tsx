// libs
import type { ReactNode } from "react";
// components
import PageTitle from "@/components/PageTitle";

const PageHeader = ({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex flex-col gap-1.5">
      <PageTitle>{title}</PageTitle>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
    </div>
    {action}
  </div>
);

export default PageHeader;
