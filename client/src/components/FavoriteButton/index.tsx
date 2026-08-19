// libs
import { Heart } from "lucide-react";
// components
import CustomButton from "@/components/CustomButton";
// others
import { cn } from "@/libs/utils";

const FavoriteButton = ({
  isFavorite,
  pending = false,
  addLabel,
  removeLabel,
  onToggle
}: {
  isFavorite: boolean;
  pending?: boolean;
  addLabel: string;
  removeLabel: string;
  onToggle: () => void;
}) => (
  <CustomButton
    size="icon-sm"
    variant="ghost"
    type="button"
    disabled={pending}
    aria-pressed={isFavorite}
    aria-label={isFavorite ? removeLabel : addLabel}
    onClick={onToggle}
    className={cn(
      "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
      isFavorite && "text-destructive hover:text-destructive"
    )}
  >
    <Heart
      className={cn("size-5", isFavorite && "fill-destructive")}
      aria-hidden="true"
    />
  </CustomButton>
);

export default FavoriteButton;
