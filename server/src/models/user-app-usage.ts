// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { UserAppUsageDocument } from "@/modules/recent-app/types";
// modules
import { RECENT_APP_CONFIG } from "@/modules/recent-app/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { USER_APP_USAGE, USER, WEB_APP } = MODEL_NAMES;

const UserAppUsageSchema = new Schema<UserAppUsageDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: USER,
      required: [true, "User ID is required"]
    },
    webAppId: {
      type: Schema.Types.ObjectId,
      ref: WEB_APP,
      required: [true, "Web app ID is required"]
    },
    lastUsedAt: {
      type: Date,
      required: [true, "Last used time is required"]
    },
    useCount: {
      type: Number,
      default: 1,
      min: 1
    },
    hiddenAt: {
      type: Date,
      default: null
    }
  },
  {
    collection: "user_app_usages",
    timestamps: { createdAt: true, updatedAt: false }
  }
);

UserAppUsageSchema.index({ userId: 1, webAppId: 1 }, { unique: true });
UserAppUsageSchema.index({ userId: 1, hiddenAt: 1, lastUsedAt: -1, _id: -1 });
// Rows with hiddenAt: null carry no date, so the TTL monitor never touches them.
UserAppUsageSchema.index(
  { hiddenAt: 1 },
  { expireAfterSeconds: RECENT_APP_CONFIG.HIDDEN_RETENTION_SECONDS }
);

const UserAppUsageModel: Model<UserAppUsageDocument> =
  model<UserAppUsageDocument>(USER_APP_USAGE, UserAppUsageSchema);

export default UserAppUsageModel;
