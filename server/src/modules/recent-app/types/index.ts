// types
import type { Request } from "express";
import type { Schema } from "mongoose";
import type { UserAppDto } from "@/modules/web-app/dtos";

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

export interface ListRecentAppsQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface RecentAppIdParams {
  appId: string;
}

export interface RecentAppIdRequest extends Omit<Request, "params"> {
  params: { appId: string };
}

export interface ListRecentAppsRequest extends Omit<Request, "query"> {
  query: ListRecentAppsQuery;
}
