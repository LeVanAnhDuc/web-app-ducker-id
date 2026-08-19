// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { NotificationDocument } from "@/modules/notification/types";
// modules
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CONFIG
} from "@/modules/notification/constants";
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
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [
        NOTIFICATION_CONFIG.TITLE_MAX_LENGTH,
        `Title must not exceed ${NOTIFICATION_CONFIG.TITLE_MAX_LENGTH} characters`
      ]
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [
        NOTIFICATION_CONFIG.MESSAGE_MAX_LENGTH,
        `Message must not exceed ${NOTIFICATION_CONFIG.MESSAGE_MAX_LENGTH} characters`
      ]
    },
    meta: {
      type: Schema.Types.Mixed,
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

const NotificationModel: Model<NotificationDocument> =
  model<NotificationDocument>(NOTIFICATION, NotificationSchema);

export default NotificationModel;
