"use client";
// libs
import { ArrowUpRight } from "lucide-react";
// components
import CardItemTitle from "@/components/CardItemTitle";
import { Card } from "@/components/ui/card";
import CustomButton from "@/components/CustomButton";
import CustomImage from "@/components/CustomImage";
import FavoriteButton from "@/components/FavoriteButton";

const RecommendedAppCard = ({
  id,
  name,
  category,
  iconUrl,
  homeUrl,
  openLabel,
  isFavorite,
  addFavoriteLabel,
  removeFavoriteLabel,
  togglePending,
  onToggleFavorite
}: {
  id: string;
  name: string;
  category: string | null;
  iconUrl: string | null;
  homeUrl: string;
  openLabel: string;
  isFavorite: boolean;
  addFavoriteLabel: string;
  removeFavoriteLabel: string;
  togglePending?: boolean;
  onToggleFavorite: () => void;
}) => {
  const initial = name.charAt(0).toUpperCase();
  const handleOpen = () => {
    window.open(homeUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <Card
      className="flex flex-col gap-4 rounded-xl border p-6"
      aria-labelledby={`rec-${name}-title`}
      data-app-id={id}
    >
      <div
        className="bg-muted text-foreground flex h-24 items-center justify-center overflow-hidden rounded-xl text-2xl font-semibold"
        aria-hidden="true"
      >
        {iconUrl ? (
          <CustomImage
            src={iconUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 object-cover"
          />
        ) : (
          initial
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardItemTitle id={`rec-${name}-title`}>{name}</CardItemTitle>
          {category && (
            <span className="text-muted-foreground text-xs">{category}</span>
          )}
        </div>
        <FavoriteButton
          isFavorite={isFavorite}
          pending={togglePending}
          addLabel={`${addFavoriteLabel}: ${name}`}
          removeLabel={`${removeFavoriteLabel}: ${name}`}
          onToggle={onToggleFavorite}
        />
      </div>
      <CustomButton
        size="sm"
        variant="outline"
        fullWidth
        onClick={handleOpen}
        iconRight={<ArrowUpRight className="size-3.5" aria-hidden="true" />}
        aria-label={`${openLabel} ${name}`}
      >
        {openLabel}
      </CustomButton>
    </Card>
  );
};

export default RecommendedAppCard;
