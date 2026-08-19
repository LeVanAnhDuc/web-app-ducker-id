// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { UserAddressDocument } from "@/modules/user/types";
// modules
import { USER_ADDRESS_CONFIG } from "@/modules/user/constants";
// validators
import { SAFE_ADDRESS_PATTERN } from "@/validators/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { USER_ADDRESS, USER } = MODEL_NAMES;

const UserAddressSchema = new Schema<UserAddressDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: USER,
      required: [true, "User ID is required"]
    },
    street: {
      type: String,
      required: [true, "Street is required"],
      trim: true,
      maxlength: [
        USER_ADDRESS_CONFIG.STREET_MAX_LENGTH,
        `Street must not exceed ${USER_ADDRESS_CONFIG.STREET_MAX_LENGTH} characters`
      ],
      match: [SAFE_ADDRESS_PATTERN, "Street contains invalid characters"]
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [
        USER_ADDRESS_CONFIG.CITY_MAX_LENGTH,
        `City must not exceed ${USER_ADDRESS_CONFIG.CITY_MAX_LENGTH} characters`
      ],
      match: [SAFE_ADDRESS_PATTERN, "City contains invalid characters"]
    },
    province: {
      type: String,
      required: [true, "Province is required"],
      trim: true,
      maxlength: [
        USER_ADDRESS_CONFIG.PROVINCE_MAX_LENGTH,
        `Province must not exceed ${USER_ADDRESS_CONFIG.PROVINCE_MAX_LENGTH} characters`
      ],
      match: [SAFE_ADDRESS_PATTERN, "Province contains invalid characters"]
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
      maxlength: [
        USER_ADDRESS_CONFIG.COUNTRY_MAX_LENGTH,
        `Country must not exceed ${USER_ADDRESS_CONFIG.COUNTRY_MAX_LENGTH} characters`
      ],
      match: [SAFE_ADDRESS_PATTERN, "Country contains invalid characters"]
    },
    postalCode: {
      type: String,
      default: null,
      trim: true,
      maxlength: [
        USER_ADDRESS_CONFIG.POSTAL_CODE_MAX_LENGTH,
        `Postal code must not exceed ${USER_ADDRESS_CONFIG.POSTAL_CODE_MAX_LENGTH} characters`
      ]
    }
  },
  {
    collection: "user_addresses",
    timestamps: true
  }
);

UserAddressSchema.index({ userId: 1 });
UserAddressSchema.index({ userId: 1, createdAt: -1 });

const UserAddressModel: Model<UserAddressDocument> = model<UserAddressDocument>(
  USER_ADDRESS,
  UserAddressSchema
);

export default UserAddressModel;
