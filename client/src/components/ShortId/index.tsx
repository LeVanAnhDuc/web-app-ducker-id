// libs
import { cn } from "@/libs/utils";

const SHORT_ID_LENGTH = 6;

const ShortId = ({
  value,
  className
}: {
  value: string;
  className?: string;
}) => (
  <span className={cn("font-mono", className)} title={value}>
    {value.length > SHORT_ID_LENGTH
      ? `${value.slice(0, SHORT_ID_LENGTH)}...`
      : value}
  </span>
);

export default ShortId;
