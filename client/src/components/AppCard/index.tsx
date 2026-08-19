// libs
import { ArrowUpRight } from "lucide-react";
// components
import CardItemTitle from "@/components/CardItemTitle";
import CustomButton from "@/components/CustomButton";
import CustomImage from "@/components/CustomImage";
import FavoriteButton from "@/components/FavoriteButton";
import { Card } from "@/components/ui/card";

const AppCard = ({
  id,
  displayName,
  category,
  description,
  iconUrl,
  homeUrl,
  isFavorite,
  openLabel,
  addFavoriteLabel,
  removeFavoriteLabel,
  togglePending = false,
  onToggleFavorite
}: {
  id: string;
  displayName: string;
  category: string | null;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  isFavorite: boolean;
  openLabel: string;
  addFavoriteLabel: string;
  removeFavoriteLabel: string;
  togglePending?: boolean;
  onToggleFavorite: () => void;
}) => {
  const initial = displayName.charAt(0).toUpperCase();
  const handleOpen = () => {
    window.open(homeUrl, "_blank", "noopener,noreferrer");
  };
  const iconNode = iconUrl ? (
    <CustomImage
      src={iconUrl}
      alt=""
      width={48}
      height={48}
      className="size-full object-cover"
    />
  ) : (
    initial
  );
  return (
    <Card
      className="flex flex-col overflow-hidden rounded-xl border p-0"
      aria-labelledby={`apps-${id}-title`}
    >
      <div className="flex flex-col gap-3.5 p-6">
        <div className="flex items-start gap-3">
          <div
            className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-semibold"
            aria-hidden="true"
          >
            {iconNode}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <CardItemTitle id={`apps-${id}-title`} className="truncate">
              {displayName}
            </CardItemTitle>
            {category && (
              <span className="text-muted-foreground text-xs font-medium">
                {category}
              </span>
            )}
          </div>
          <FavoriteButton
            isFavorite={isFavorite}
            pending={togglePending}
            addLabel={`${addFavoriteLabel}: ${displayName}`}
            removeLabel={`${removeFavoriteLabel}: ${displayName}`}
            onToggle={onToggleFavorite}
          />
        </div>
        <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm leading-relaxed">
          {description}
        </p>
      </div>
      <div className="border-border border-t" aria-hidden="true" />
      <div className="flex items-center justify-end px-6 py-3">
        <CustomButton
          size="sm"
          onClick={handleOpen}
          iconRight={<ArrowUpRight className="size-3" aria-hidden="true" />}
          aria-label={`${openLabel} ${displayName}`}
        >
          {openLabel}
        </CustomButton>
      </div>
    </Card>
  );
};

export default AppCard;
