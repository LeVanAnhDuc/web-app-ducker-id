// libs
import type { LucideIcon } from "lucide-react";
// components
import { Badge } from "@/components/ui/badge";
import CustomButton from "@/components/CustomButton";

const PaymentMethodRow = ({
  icon: Icon,
  brandLabel,
  endingLabel,
  expiresLabel,
  defaultLabel,
  isDefault,
  editLabel,
  onEdit
}: {
  icon: LucideIcon;
  brandLabel: string;
  endingLabel: string;
  expiresLabel: string;
  defaultLabel: string;
  isDefault: boolean;
  editLabel: string;
  onEdit: () => void;
}) => (
  <div className="border-border flex flex-wrap items-center gap-4 border-b px-6 py-4 last:border-b-0">
    <div className="bg-muted/60 border-border flex size-10 shrink-0 items-center justify-center rounded-xl border">
      <Icon className="text-foreground size-5" aria-hidden="true" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-foreground truncate text-sm font-semibold">
        {brandLabel} {endingLabel}
      </p>
      <p className="text-muted-foreground truncate text-sm">{expiresLabel}</p>
    </div>
    {isDefault ? (
      <Badge
        variant="secondary"
        className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5"
      >
        {defaultLabel}
      </Badge>
    ) : null}
    <CustomButton variant="outline" size="sm" onClick={onEdit}>
      {editLabel}
    </CustomButton>
  </div>
);

export default PaymentMethodRow;
