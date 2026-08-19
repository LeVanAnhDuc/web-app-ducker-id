// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { AUTHENTICATION } = MODEL_NAMES;

const AuthenticationSchema = new Schema<AuthenticationDocument>(
  {
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    verifiedEmail: {
      type: Boolean,
      default: false
    },
    roles: {
      type: String,
      enum: Object.values(AUTHENTICATION_ROLES),
      default: AUTHENTICATION_ROLES.USER
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tempPasswordHash: {
      type: String,
      default: null
    },
    tempPasswordExpAt: {
      type: Date,
      default: null
    },
    tempPasswordUsed: {
      type: Boolean,
      default: false
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    tokenVersion: {
      type: Number,
      default: 0
    }
  },
  {
    collection: "auths",
    timestamps: true
  }
);

const AuthenticationModel: Model<AuthenticationDocument> =
  model<AuthenticationDocument>(AUTHENTICATION, AuthenticationSchema);

export default AuthenticationModel;
