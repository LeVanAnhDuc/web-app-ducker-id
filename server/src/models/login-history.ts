// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { LoginHistoryDocument } from "@/modules/login-history/types";
// modules
import {
  LOGIN_METHODS,
  LOGIN_STATUSES,
  LOGIN_FAIL_REASONS,
  DEVICE_TYPES,
  CLIENT_TYPES,
  GEO_DEFAULTS,
  LOGIN_HISTORY_CONFIG
} from "@/modules/login-history/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { LOGIN_HISTORY, AUTHENTICATION } = MODEL_NAMES;

const LoginHistorySchema = new Schema<LoginHistoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: AUTHENTICATION,
      default: null,
      index: true
    },
    usernameAttempted: {
      type: String,
      required: [true, "Username attempted is required"],
      trim: true,
      lowercase: true
    },
    method: {
      type: String,
      enum: Object.values(LOGIN_METHODS),
      required: [true, "Login method is required"]
    },
    status: {
      type: String,
      enum: Object.values(LOGIN_STATUSES),
      required: [true, "Login status is required"],
      index: true
    },
    failReason: {
      type: String,
      enum: Object.values(LOGIN_FAIL_REASONS),
      default: null
    },
    ip: {
      type: String,
      required: [true, "IP address is required"],
      trim: true,
      maxlength: 45,
      index: true
    },
    country: {
      type: String,
      default: GEO_DEFAULTS.UNKNOWN_COUNTRY
    },
    city: {
      type: String,
      default: GEO_DEFAULTS.UNKNOWN_CITY
    },
    deviceType: {
      type: String,
      enum: Object.values(DEVICE_TYPES),
      default: DEVICE_TYPES.UNKNOWN
    },
    os: {
      type: String,
      default: GEO_DEFAULTS.UNKNOWN_COUNTRY
    },
    browser: {
      type: String,
      default: GEO_DEFAULTS.UNKNOWN_COUNTRY
    },
    userAgent: {
      type: String,
      default: ""
    },
    clientType: {
      type: String,
      enum: Object.values(CLIENT_TYPES),
      default: CLIENT_TYPES.WEB
    },
    timezoneOffset: {
      type: String,
      default: null
    },
    isAnomaly: {
      type: Boolean,
      default: false
    },
    anomalyReasons: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (v: unknown[]) =>
            v.length <= LOGIN_HISTORY_CONFIG.MAX_ANOMALY_REASONS,
          message: `Anomaly reasons must not exceed ${LOGIN_HISTORY_CONFIG.MAX_ANOMALY_REASONS} items`
        }
      ]
    }
  },
  {
    collection: "login_histories",
    timestamps: { createdAt: true, updatedAt: false }
  }
);

LoginHistorySchema.index({ userId: 1, createdAt: -1 });
LoginHistorySchema.index({ userId: 1, status: 1, createdAt: -1 });
LoginHistorySchema.index({ ip: 1, createdAt: -1 });
LoginHistorySchema.index({ usernameAttempted: 1, createdAt: -1 });
LoginHistorySchema.index({ createdAt: -1 });
LoginHistorySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: LOGIN_HISTORY_CONFIG.TTL_SECONDS }
);

const LoginHistoryModel: Model<LoginHistoryDocument> =
  model<LoginHistoryDocument>(LOGIN_HISTORY, LoginHistorySchema);

export default LoginHistoryModel;
