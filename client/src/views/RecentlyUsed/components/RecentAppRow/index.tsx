"use client";
// libs
import { ArrowUpRight, Timer, X } from "lucide-react";
// components
import CardItemTitle from "@/components/CardItemTitle";
import CustomButton from "@/components/CustomButton";
import CustomImage from "@/components/CustomImage";
import FavoriteButton from "@/components/FavoriteButton";
import { Card } from "@/components/ui/card";

const RecentAppRow = ({
  id,
  name,
  category,
  iconUrl,
  lastOpened,
  openedCount,
  isFavorite,
  labels,
  togglePending,
  removePending,
  onOpen,
  onToggleFavorite,
  onRemove
}: {
  id: string;
  name: string;
  category: string | null;
  iconUrl: string | null;
  lastOpened: string;
  openedCount: string;
  isFavorite: boolean;
  labels: {
    open: string;
    remove: string;
    lastOpened: string;
    addFavorite: string;
    removeFavorite: string;
  };
  togglePending: boolean;
  removePending: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onRemove: () => void;
}) => (
  <Card
    className="flex flex-row flex-wrap items-center gap-3.5 rounded-xl border p-4"
    aria-labelledby={`recent-${id}-title`}
  >
    <div
      className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-semibold"
      aria-hidden="true"
    >
      {iconUrl ? (
        <CustomImage
          src={iconUrl}
          alt=""
          width={44}
          height={44}
          className="size-full object-cover"
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <CardItemTitle id={`recent-${id}-title`} className="truncate">
        {name}
      </CardItemTitle>
      <span className="text-muted-foreground text-xs">
        {[category, openedCount].filter(Boolean).join(" · ")}
      </span>
    </div>
    <div className="text-info flex items-center gap-1.5">
      <Timer className="size-3.5" aria-hidden="true" />
      <span className="text-xs font-semibold">
        <span className="sr-only">{labels.lastOpened}: </span>
        {lastOpened}
      </span>
    </div>
    <div className="flex items-center gap-1">
      <FavoriteButton
        isFavorite={isFavorite}
        pending={togglePending}
        addLabel={`${labels.addFavorite}: ${name}`}
        removeLabel={`${labels.removeFavorite}: ${name}`}
        onToggle={onToggleFavorite}
      />
      <CustomButton
        size="icon-sm"
        variant="ghost"
        type="button"
        disabled={removePending}
        aria-label={`${labels.remove}: ${name}`}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </CustomButton>
      <CustomButton
        size="sm"
        onClick={onOpen}
        iconRight={<ArrowUpRight className="size-3" aria-hidden="true" />}
        aria-label={`${labels.open} ${name}`}
      >
        {labels.open}
      </CustomButton>
    </div>
  </Card>
);

export default RecentAppRow;
