// types
import type { FilterQuery } from "mongoose";
import type { ContactDocument } from "../types";
import type { AdminContactsQueryDto } from "../dtos/requests";
// others
import { escapeRegex } from "@/utils/string/escape-regex";

export const buildContactFilter = (
  query: AdminContactsQueryDto
): FilterQuery<ContactDocument> => {
  const filter: FilterQuery<ContactDocument> = {};

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;

  if (query.email)
    filter.email = { $regex: escapeRegex(query.email), $options: "i" };

  if (query.search) {
    const searchRegex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [{ subject: searchRegex }, { email: searchRegex }];
  }

  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) filter.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filter.createdAt.$lte = new Date(query.toDate);
  }

  return filter;
};
