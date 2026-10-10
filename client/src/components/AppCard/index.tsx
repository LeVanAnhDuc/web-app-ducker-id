"use client";
// libs
import { ArrowUpRight } from "lucide-react";
// types
import type { UserCategory } from "@/types/Apps";
// components
import CardItemTitle from "@/components/CardItemTitle";
import CategoryChips from "@/components/CategoryChips";
import CustomButton from "@/components/CustomButton";
import CustomImage from "@/components/CustomImage";
import FavoriteButton from "@/components/FavoriteButton";
import { Card } from "@/components/ui/card";
// hooks
import { useOpenApp } from "@/hooks";

const AppCard = ({
  id,
  displayName,
  categories,
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
  categories: UserCategory[];
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
  const openApp = useOpenApp();
  const handleOpen = () => openApp({ _id: id, homeUrl });
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
          </div>
          <FavoriteButton
            isFavorite={isFavorite}
            pending={togglePending}
            addLabel={`${addFavoriteLabel}: ${displayName}`}
            removeLabel={`${removeFavoriteLabel}: ${displayName}`}
            onToggle={onToggleFavorite}
          />
        </div>
        <CategoryChips categories={categories} />
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
