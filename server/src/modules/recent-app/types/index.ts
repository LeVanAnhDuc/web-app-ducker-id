// types
import type { Schema } from "mongoose";

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
