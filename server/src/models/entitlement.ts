// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { EntitlementDocument } from "@/modules/entitlement/types";
// others
import { MODEL_NAMES } from "@/constants/models";

const { ENTITLEMENT, USER, WEB_APP } = MODEL_NAMES;

const EntitlementSchema = new Schema<EntitlementDocument>(
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
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: USER,
      required: [true, "Granted by is required"]
    },
    grantedAt: {
      type: Date,
      required: [true, "Granted at is required"],
      default: () => new Date()
    },
    revokedAt: {
      type: Date,
      default: null
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    lastLaunchedAt: {
      type: Date,
      default: null
    },
    launchCount: {
      type: Number,
      default: 0,
      min: [0, "Launch count cannot be negative"]
    }
  },
  {
    collection: "entitlements",
    timestamps: true
  }
);

EntitlementSchema.index({ userId: 1, webAppId: 1 }, { unique: true });
EntitlementSchema.index({ userId: 1, revokedAt: 1 });
EntitlementSchema.index({ userId: 1, isFavorite: 1 });
EntitlementSchema.index({ userId: 1, lastLaunchedAt: -1 });
EntitlementSchema.index({ webAppId: 1, revokedAt: 1 });

EntitlementSchema.virtual("user", {
  ref: USER,
  localField: "userId",
  foreignField: "_id",
  justOne: true
});

EntitlementSchema.virtual("webApp", {
  ref: WEB_APP,
  localField: "webAppId",
  foreignField: "_id",
  justOne: true
});

const EntitlementModel: Model<EntitlementDocument> = model<EntitlementDocument>(
  ENTITLEMENT,
  EntitlementSchema
);

export default EntitlementModel;
