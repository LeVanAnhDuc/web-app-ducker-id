// types
import type { InvoiceStatus } from "@/types/Billing";
// components
import { Badge } from "@/components/ui/badge";
// others
import { cn } from "@/libs/utils";
import CONSTANTS from "@/constants";

const InvoiceStatusBadge = ({
  status,
  label
}: {
  status: InvoiceStatus;
  label: string;
}) => {
  const tone =
    status === CONSTANTS.INVOICE_STATUS.PAID
      ? "bg-success/15 text-success"
      : status === CONSTANTS.INVOICE_STATUS.PENDING
        ? "bg-warning/20 text-warning-foreground"
        : "bg-destructive/15 text-destructive";
  return (
    <Badge
      variant="secondary"
      className={cn("rounded-full px-2.5 py-0.5", tone)}
    >
      {label}
    </Badge>
  );
};

export default InvoiceStatusBadge;
