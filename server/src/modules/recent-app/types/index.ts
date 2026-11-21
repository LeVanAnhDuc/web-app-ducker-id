// types
import type { Request } from "express";
import type { Schema } from "mongoose";
import type { UserAppDto } from "@/modules/web-app/dtos";
import type {
  ListRecentAppsQueryDto,
  RecentAppIdParamsDto,
  RecentAppsStatsQueryDto
} from "../dtos/requests";

export interface UserAppUsageDocument {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  webAppId: Schema.Types.ObjectId;
  lastUsedAt: Date;
  useCount: number;
  hiddenAt: Date | null;
  createdAt: Date;
}

export interface RecentAppUsage {
  id: string;
  webAppId: string;
  lastUsedAt: Date;
  useCount: number;
}

export interface RecentAppDto extends UserAppDto {
  lastUsedAt: string;
  useCount: number;
}

// The index signature keeps the handlers assignable to Express's own, whose
// query and params are string dictionaries.
export interface RecentAppIdRequest extends Omit<Request, "params"> {
  params: RecentAppIdParamsDto & Record<string, string>;
}

export interface ListRecentAppsRequest extends Omit<Request, "query"> {
  query: ListRecentAppsQueryDto & Request["query"];
}

export interface RecentAppsStatsRequest extends Omit<Request, "query"> {
  query: RecentAppsStatsQueryDto & Request["query"];
}
