// types
import type { WebAppCategoryDocument } from "../types";

export interface WebAppCategoryRepository {
  findAll(): Promise<WebAppCategoryDocument[]>;
  existsById(id: string): Promise<boolean>;
}
