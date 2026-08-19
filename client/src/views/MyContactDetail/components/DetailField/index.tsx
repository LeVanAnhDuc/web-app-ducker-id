// libs
import type { ReactNode } from "react";

const DetailField = ({
  label,
  value,
  span = false
}: {
  label: string;
  value: ReactNode;
  span?: boolean;
}) => (
  <div className={span ? "sm:col-span-2" : undefined}>
    <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {label}
    </dt>
    <dd className="mt-1 text-sm">{value}</dd>
  </div>
);

export default DetailField;
