// types
import type { Request } from "express";
import type { Schema } from "mongoose";
import type { CATEGORY_MOVE_DIRECTIONS } from "@/modules/category/constants";
import type {
  CategoryIdParamsDto,
  CreateCategoryBodyDto,
  DeleteCategoryBodyDto,
  MoveCategoryBodyDto,
  UpdateCategoryBodyDto
} from "../dtos/requests";

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

// The index signature keeps the handlers assignable to Express's own, whose
// params are a string dictionary.
type CategoryIdParams = CategoryIdParamsDto & Record<string, string>;

export interface CreateCategoryRequest extends Omit<Request, "body"> {
  body: CreateCategoryBodyDto;
}

export interface UpdateCategoryRequest extends Omit<
  Request,
  "body" | "params"
> {
  body: UpdateCategoryBodyDto;
  params: CategoryIdParams;
}

export interface MoveCategoryRequest extends Omit<Request, "body" | "params"> {
  body: MoveCategoryBodyDto;
  params: CategoryIdParams;
}

export interface CategoryIdRequest extends Omit<Request, "params"> {
  params: CategoryIdParams;
}

export interface DeleteCategoryRequest extends Omit<
  Request,
  "body" | "params"
> {
  body: DeleteCategoryBodyDto;
  params: CategoryIdParams;
}
