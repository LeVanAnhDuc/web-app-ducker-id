// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { EntitlementDocument } from "@/modules/entitlement/types";
// modules
import { ENTITLEMENT_EFFECTS } from "@/modules/entitlement/constants";
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
    effect: {
      type: String,
      enum: Object.values(ENTITLEMENT_EFFECTS),
      required: [true, "Effect is required"]
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: USER,
      required: [true, "Updated by is required"]
    }
  },
  {
    collection: "entitlements",
    timestamps: true
  }
);

EntitlementSchema.index({ userId: 1, webAppId: 1 }, { unique: true });
EntitlementSchema.index({ webAppId: 1 });

const EntitlementModel: Model<EntitlementDocument> = model<EntitlementDocument>(
  ENTITLEMENT,
  EntitlementSchema
);

export default EntitlementModel;
