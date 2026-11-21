// types
import type { Schema } from "mongoose";
import type { CATEGORY_MOVE_DIRECTIONS } from "@/modules/category/constants";

export interface CategoryName {
  en: string;
  vi: string;
}

export interface WebAppCategoryDocument {
  _id: Schema.Types.ObjectId;
  slug: string;
  name: CategoryName;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryWithAppCount extends WebAppCategoryDocument {
  appCount: number;
}

export type CategoryMoveDirection =
  (typeof CATEGORY_MOVE_DIRECTIONS)[keyof typeof CATEGORY_MOVE_DIRECTIONS];

export interface CategoryCreateInput {
  slug: string;
  name: CategoryName;
  sortOrder: number;
}

export interface CategoryUpdateInput {
  slug: string;
  name: CategoryName;
}

export interface CategoryReassignment {
  appId: string;
  categoryId: string;
}

/** An app whose only category is the one being deleted. */
export interface OrphanApp {
  _id: string;
  displayName: string;
}
