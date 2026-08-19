// libs
import type { ReactNode } from "react";

const DetailField = ({
  label,
  value,
  mono = false,
  span = false
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  span?: boolean;
}) => (
  <div className={span ? "sm:col-span-2" : undefined}>
    <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {label}
    </dt>
    <dd className={mono ? "mt-1 font-mono text-xs break-all" : "mt-1 text-sm"}>
      {value}
    </dd>
  </div>
);

export default DetailField;
