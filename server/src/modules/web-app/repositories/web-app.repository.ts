// types
import type { FilterQuery } from "mongoose";
import type {
  WebAppDocument,
  WebAppCreateInput,
  WebAppUpdateInput,
  WebAppWithCategory
} from "../types";

export interface WebAppRepository {
  findAll(filter: FilterQuery<WebAppDocument>): Promise<WebAppDocument[]>;
  findById(id: string): Promise<WebAppDocument | null>;
  findByClientId(clientId: string): Promise<WebAppDocument | null>;
  existsByName(name: string): Promise<boolean>;
  existsByNameExcludingId(name: string, excludeId: string): Promise<boolean>;
  create(data: WebAppCreateInput): Promise<WebAppDocument>;
  updateById(
    id: string,
    data: WebAppUpdateInput
  ): Promise<WebAppDocument | null>;
  findActivePaginated(
    filter: FilterQuery<WebAppDocument>,
    options: { skip: number; limit: number }
  ): Promise<WebAppWithCategory[]>;
  findActiveByIds(
    ids: string[],
    filter: { role?: string; search?: string; categoryId?: string }
  ): Promise<WebAppWithCategory[]>;
  countActive(filter: FilterQuery<WebAppDocument>): Promise<number>;
}
