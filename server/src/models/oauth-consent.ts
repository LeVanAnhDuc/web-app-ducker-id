// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { OAuthConsentDocument } from "@/modules/oauth-consent/types";
// modules
import { OAUTH_CONSENT_CONFIG } from "@/modules/oauth-consent/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { OAUTH_CONSENT, USER, WEB_APP } = MODEL_NAMES;

const OAuthConsentSchema = new Schema<OAuthConsentDocument>(
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
    scopes: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (v: unknown[]) =>
            v.length <= OAUTH_CONSENT_CONFIG.MAX_SCOPES,
          message: `Scopes must not exceed ${OAUTH_CONSENT_CONFIG.MAX_SCOPES} items`
        }
      ]
    },
    scopeSetHash: {
      type: String,
      required: [true, "Scope set hash is required"],
      trim: true,
      maxlength: [
        OAUTH_CONSENT_CONFIG.SCOPE_SET_HASH_MAX_LENGTH,
        `Scope set hash must not exceed ${OAUTH_CONSENT_CONFIG.SCOPE_SET_HASH_MAX_LENGTH} characters`
      ]
    },
    consentedAt: {
      type: Date,
      required: [true, "Consented at is required"],
      default: () => new Date()
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  {
    collection: "oauth_consents",
    timestamps: false
  }
);

OAuthConsentSchema.index(
  { userId: 1, webAppId: 1, scopeSetHash: 1 },
  { unique: true }
);
OAuthConsentSchema.index({ userId: 1, revokedAt: 1 });
OAuthConsentSchema.index({ webAppId: 1, revokedAt: 1 });

const OAuthConsentModel: Model<OAuthConsentDocument> =
  model<OAuthConsentDocument>(OAUTH_CONSENT, OAuthConsentSchema);

export default OAuthConsentModel;
