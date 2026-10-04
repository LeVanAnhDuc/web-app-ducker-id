// types
import type { FilterQuery } from "mongoose";
import type { ContactDocument, ContactStatus } from "../types";
import type { PaginationOptions } from "@/types/common";

export type CreateContactInput = Omit<Partial<ContactDocument>, "userId"> & {
  userId?: string | null;
};

export interface ContactRepository {
  create(data: CreateContactInput): Promise<ContactDocument>;
  findAll(
    filter: FilterQuery<ContactDocument>,
    options: PaginationOptions
  ): Promise<{ data: ContactDocument[]; total: number }>;
  findById(id: string): Promise<ContactDocument | null>;
  updateStatus(
    id: string,
    status: ContactStatus
  ): Promise<ContactDocument | null>;
  findByUser(
    userId: string,
    filter: FilterQuery<ContactDocument>,
    options: PaginationOptions
  ): Promise<{ data: ContactDocument[]; total: number }>;
  findByIdForUser(id: string, userId: string): Promise<ContactDocument | null>;
}
