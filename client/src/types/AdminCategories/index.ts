// types
import type { CategoryName } from "@/types/Apps";
// others
import type { CATEGORY_MOVE_DIRECTION } from "@/constants/category";

export type CategoryMoveDirection =
  (typeof CATEGORY_MOVE_DIRECTION)[keyof typeof CATEGORY_MOVE_DIRECTION];

export interface AdminCategory {
  _id: string;
  slug: string;
  name: CategoryName;
  sortOrder: number;
  /** Apps referencing this category, active or not. */
  appCount: number;
}

export interface OrphanApp {
  _id: string;
  displayName: string;
}

export interface CategoryDeleteImpact {
  total: number;
  /** Apps whose only category is this one — each needs a target. */
  orphaned: OrphanApp[];
}

export interface CategoryReassignment {
  appId: string;
  categoryId: string;
}

export interface AdminCategoryFormValues {
  nameEn: string;
  nameVi: string;
}

export interface CategoryUpdateInput {
  name: Partial<CategoryName>;
}

/** Bulk target plus per-app overrides; an app's target is override ?? bulk. */
export interface ReassignState {
  bulk: string;
  overrides: Record<string, string>;
}
