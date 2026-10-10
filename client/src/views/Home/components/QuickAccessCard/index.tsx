"use client";
// types
import type { ReactNode } from "react";
import type { UserCategory } from "@/types/Apps";
// components
import CategoryChips from "@/components/CategoryChips";
import CustomButton from "@/components/CustomButton";
import CustomImage from "@/components/CustomImage";
import FavoriteButton from "@/components/FavoriteButton";
// hooks
import { useLocalizedName, useOpenApp } from "@/hooks";

const QuickAccessCard = ({
  id,
  name,
  categories,
  iconUrl,
  homeUrl,
  isFavorite,
  addFavoriteLabel,
  removeFavoriteLabel,
  togglePending,
  onToggleFavorite
}: {
  id: string;
  name: string;
  categories: UserCategory[];
  iconUrl: string | null;
  homeUrl: string;
  isFavorite: boolean;
  addFavoriteLabel: string;
  removeFavoriteLabel: string;
  togglePending?: boolean;
  onToggleFavorite: () => void;
}) => {
  const initial = name.charAt(0).toUpperCase();
  const openApp = useOpenApp();
  const localize = useLocalizedName();
  const categoryNames = categories.map((c) => localize(c.name)).join(", ");
  const handleOpen = () => openApp({ _id: id, homeUrl });
  const icon: ReactNode = iconUrl ? (
    <CustomImage
      src={iconUrl}
      alt=""
      width={40}
      height={40}
      className="size-full object-cover"
    />
  ) : (
    initial
  );
  return (
    <div className="relative" data-app-id={id}>
      <CustomButton
        type="button"
        variant="ghost"
        size="default"
        onClick={handleOpen}
        aria-label={categoryNames ? `${name}, ${categoryNames}` : name}
        className="bg-muted flex h-[140px] w-full cursor-pointer flex-col items-start justify-start gap-2.5 rounded-xl p-6 text-left whitespace-normal transition-opacity hover:opacity-90"
      >
        <div
          className="bg-background text-foreground flex size-10 items-center justify-center overflow-hidden rounded-xl text-base font-semibold"
          aria-hidden="true"
        >
          {icon}
        </div>
        <span
          className="text-foreground text-base font-bold"
          aria-hidden="true"
        >
          {name}
        </span>
        <div className="w-full" aria-hidden="true">
          <CategoryChips categories={categories} interactive={false} />
        </div>
      </CustomButton>
      <div className="text-muted-foreground [&_svg]:text-muted-foreground absolute top-3 right-3">
        <FavoriteButton
          isFavorite={isFavorite}
          pending={togglePending}
          addLabel={`${addFavoriteLabel}: ${name}`}
          removeLabel={`${removeFavoriteLabel}: ${name}`}
          onToggle={onToggleFavorite}
        />
      </div>
    </div>
  );
};

export default QuickAccessCard;
