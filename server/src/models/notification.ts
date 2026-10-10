// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { NotificationDocument } from "@/modules/notification/types";
// modules
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CONFIG
} from "@/modules/notification/constants";
import { isInternalLink } from "@/modules/notification/helpers";
// others
import { MODEL_NAMES } from "@/constants/models";

const { NOTIFICATION, USER } = MODEL_NAMES;

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: USER,
      required: [true, "User ID is required"]
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: [true, "Notification type is required"]
    },
    category: {
      type: String,
      enum: Object.values(NOTIFICATION_CATEGORIES),
      required: [true, "Notification category is required"]
    },
    // Text is not stored: the client renders `notifications.types.<type>` in
    // the reader's locale and interpolates these values.
    params: {
      type: Schema.Types.Mixed,
      default: {}
    },
    link: {
      type: String,
      default: null,
      maxlength: [
        NOTIFICATION_CONFIG.LINK_MAX_LENGTH,
        `Link must not exceed ${NOTIFICATION_CONFIG.LINK_MAX_LENGTH} characters`
      ],
      validate: {
        validator: (value: string | null) =>
          value === null || isInternalLink(value),
        message: "Link must be an internal path"
      }
    },
    dedupeKey: {
      type: String,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    collection: "notifications",
    timestamps: { createdAt: true, updatedAt: false }
  }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
NotificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } }
);

const NotificationModel: Model<NotificationDocument> =
  model<NotificationDocument>(NOTIFICATION, NotificationSchema);

export default NotificationModel;
