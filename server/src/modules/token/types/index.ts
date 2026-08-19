// types
import type { Schema } from "mongoose";

export interface RefreshTokenDocument {
  _id: Schema.Types.ObjectId;
  authId: Schema.Types.ObjectId;
  webAppId: Schema.Types.ObjectId | null;
  tokenHash: string;
  isRevoked: boolean;
  revokedAt: Date | null;
  expiresAt: Date;
  ip: string;
  createdAt: Date;
}

export interface CreateRefreshTokenData {
  authId: Schema.Types.ObjectId | string;
  webAppId?: Schema.Types.ObjectId | string | null;
  tokenHash: string;
  expiresAt: Date;
  ip: string;
}
