// types
import type { WebAppCategoryDocument } from "../types";

export interface UserCategoryDto {
  _id: string;
  slug: string;
  displayName: string;
}

export const toUserCategoryDto = (
  doc: WebAppCategoryDocument
): UserCategoryDto => ({
  _id: doc._id.toString(),
  slug: doc.name,
  displayName: doc.displayName
});
