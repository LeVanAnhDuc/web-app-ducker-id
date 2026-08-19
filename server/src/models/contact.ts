// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { ContactDocument } from "@/modules/contact-admin/types";
// modules
import {
  CONTACT_PRIORITIES,
  CONTACT_STATUSES
} from "@/modules/contact-admin/constants";
// validators
import { CONTACT_CONFIG, EMAIL_FORMAT_PATTERN } from "@/validators/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { CONTACT } = MODEL_NAMES;

const ContactSchema = new Schema<ContactDocument>(
  {
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: null,
      match: [EMAIL_FORMAT_PATTERN, "Invalid email format"]
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      minlength: [
        CONTACT_CONFIG.SUBJECT_MIN_LENGTH,
        `Subject must be at least ${CONTACT_CONFIG.SUBJECT_MIN_LENGTH} characters`
      ],
      maxlength: [
        CONTACT_CONFIG.SUBJECT_MAX_LENGTH,
        `Subject must not exceed ${CONTACT_CONFIG.SUBJECT_MAX_LENGTH} characters`
      ]
    },
    priority: {
      type: String,
      required: [true, "Priority is required"],
      enum: Object.values(CONTACT_PRIORITIES),
      default: CONTACT_PRIORITIES.MEDIUM
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [
        CONTACT_CONFIG.MESSAGE_MIN_LENGTH,
        `Message must be at least ${CONTACT_CONFIG.MESSAGE_MIN_LENGTH} characters`
      ],
      maxlength: [
        CONTACT_CONFIG.MESSAGE_MAX_LENGTH,
        `Message must not exceed ${CONTACT_CONFIG.MESSAGE_MAX_LENGTH} characters`
      ]
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: Object.values(CONTACT_STATUSES),
      default: CONTACT_STATUSES.NEW
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: MODEL_NAMES.USER,
      default: null
    }
  },
  {
    collection: "contacts",
    timestamps: true
  }
);

ContactSchema.index({ status: 1 });
ContactSchema.index({ createdAt: -1 });
ContactSchema.index({ status: 1, createdAt: -1 });
ContactSchema.index({ userId: 1, createdAt: -1 });

const ContactModel: Model<ContactDocument> = model<ContactDocument>(
  CONTACT,
  ContactSchema
);

export default ContactModel;
