"use client";

// libs
import { useEffect } from "react";
// types
import type { AdminCategory } from "@/types/AdminCategories";

/** A target deleted in another tab disappears from the selects and from the chosen values (DR-18). */
const ReassignPruneEffect = ({
  targets,
  onPrune
}: {
  targets: AdminCategory[];
  onPrune: (validIds: Set<string>) => void;
}) => {
  useEffect(() => {
    onPrune(new Set(targets.map((c) => c._id)));
  }, [targets]);
  return null;
};

export default ReassignPruneEffect;
