// types
import type { Schema } from "mongoose";

export interface OAuthConsentDocument {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  webAppId: Schema.Types.ObjectId;
  scopes: string[];
  scopeSetHash: string;
  consentedAt: Date;
  revokedAt: Date | null;
}
