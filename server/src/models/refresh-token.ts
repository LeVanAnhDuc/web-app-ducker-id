// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { RefreshTokenDocument } from "@/modules/token/types";
// modules
import { REFRESH_TOKEN_CONFIG } from "@/modules/token/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { REFRESH_TOKEN, AUTHENTICATION, WEB_APP } = MODEL_NAMES;

const RefreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    authId: {
      type: Schema.Types.ObjectId,
      ref: AUTHENTICATION,
      required: [true, "Auth ID is required"]
    },
    webAppId: {
      type: Schema.Types.ObjectId,
      ref: WEB_APP,
      default: null
    },
    tokenHash: {
      type: String,
      required: [true, "Token hash is required"],
      trim: true,
      maxlength: [
        REFRESH_TOKEN_CONFIG.TOKEN_HASH_MAX_LENGTH,
        `Token hash must not exceed ${REFRESH_TOKEN_CONFIG.TOKEN_HASH_MAX_LENGTH} characters`
      ],
      unique: true
    },
    isRevoked: {
      type: Boolean,
      default: false
    },
    revokedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: [true, "Expires at is required"]
    },
    ip: {
      type: String,
      required: [true, "IP address is required"],
      trim: true,
      maxlength: [
        REFRESH_TOKEN_CONFIG.IP_MAX_LENGTH,
        `IP must not exceed ${REFRESH_TOKEN_CONFIG.IP_MAX_LENGTH} characters`
      ]
    }
  },
  {
    collection: "refresh_tokens",
    timestamps: { createdAt: true, updatedAt: false }
  }
);

RefreshTokenSchema.index({ authId: 1, createdAt: -1 });
RefreshTokenSchema.index({ authId: 1, isRevoked: 1 });
RefreshTokenSchema.index({ webAppId: 1, authId: 1 });
RefreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: REFRESH_TOKEN_CONFIG.TTL_SECONDS }
);

const RefreshTokenModel: Model<RefreshTokenDocument> =
  model<RefreshTokenDocument>(REFRESH_TOKEN, RefreshTokenSchema);

export default RefreshTokenModel;
