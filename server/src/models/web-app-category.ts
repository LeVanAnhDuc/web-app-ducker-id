// libs
import { Schema, model, type Model } from "mongoose";
// types
import type {
  CategoryName,
  WebAppCategoryDocument
} from "@/modules/category/types";
// modules
import {
  CATEGORY_CONFIG,
  CATEGORY_NAME_COLLATION
} from "@/modules/category/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { WEB_APP_CATEGORY } = MODEL_NAMES;

const nameField = (label: string) => ({
  type: String,
  required: [true, `${label} is required`] as [boolean, string],
  trim: true,
  maxlength: [
    CATEGORY_CONFIG.NAME_MAX_LENGTH,
    `${label} must not exceed ${CATEGORY_CONFIG.NAME_MAX_LENGTH} characters`
  ] as [number, string]
});

const CategoryNameSchema = new Schema<CategoryName>(
  {
    en: nameField("English name"),
    vi: nameField("Vietnamese name")
  },
  { _id: false }
);

const WebAppCategorySchema = new Schema<WebAppCategoryDocument>(
  {
    slug: {
      type: String,
      required: [true, "Slug is required"],
      trim: true,
      lowercase: true,
      maxlength: [
        CATEGORY_CONFIG.SLUG_MAX_LENGTH,
        `Slug must not exceed ${CATEGORY_CONFIG.SLUG_MAX_LENGTH} characters`
      ],
      unique: true
    },
    name: {
      type: CategoryNameSchema,
      required: [true, "Name is required"]
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

WebAppCategorySchema.index(
  { "name.en": 1 },
  { unique: true, collation: CATEGORY_NAME_COLLATION }
);
WebAppCategorySchema.index({ sortOrder: 1, _id: 1 });

const WebAppCategoryModel: Model<WebAppCategoryDocument> =
  model<WebAppCategoryDocument>(WEB_APP_CATEGORY, WebAppCategorySchema);

export default WebAppCategoryModel;
