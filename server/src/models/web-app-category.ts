// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { WebAppCategoryDocument } from "@/modules/web-app/types";
// modules
import { WEB_APP_CATEGORY_CONFIG } from "@/modules/web-app/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { WEB_APP_CATEGORY } = MODEL_NAMES;

const WebAppCategorySchema = new Schema<WebAppCategoryDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      lowercase: true,
      maxlength: [
        WEB_APP_CATEGORY_CONFIG.NAME_MAX_LENGTH,
        `Name must not exceed ${WEB_APP_CATEGORY_CONFIG.NAME_MAX_LENGTH} characters`
      ],
      unique: true
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      maxlength: [
        WEB_APP_CATEGORY_CONFIG.DISPLAY_NAME_MAX_LENGTH,
        `Display name must not exceed ${WEB_APP_CATEGORY_CONFIG.DISPLAY_NAME_MAX_LENGTH} characters`
      ]
    },
    icon: {
      type: String,
      default: null,
      trim: true,
      maxlength: [
        WEB_APP_CATEGORY_CONFIG.ICON_MAX_LENGTH,
        `Icon must not exceed ${WEB_APP_CATEGORY_CONFIG.ICON_MAX_LENGTH} characters`
      ]
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  {
    collection: "web_app_categories",
    timestamps: true
  }
);

WebAppCategorySchema.index({ sortOrder: 1, name: 1 });

const WebAppCategoryModel: Model<WebAppCategoryDocument> =
  model<WebAppCategoryDocument>(WEB_APP_CATEGORY, WebAppCategorySchema);

export default WebAppCategoryModel;
