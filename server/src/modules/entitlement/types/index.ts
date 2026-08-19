// types
import type { Schema } from "mongoose";

export interface EntitlementDocument {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  webAppId: Schema.Types.ObjectId;
  grantedBy: Schema.Types.ObjectId;
  grantedAt: Date;
  revokedAt: Date | null;
  isFavorite: boolean;
  lastLaunchedAt: Date | null;
  launchCount: number;
  createdAt: Date;
  updatedAt: Date;
}
