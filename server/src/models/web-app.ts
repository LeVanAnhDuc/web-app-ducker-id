// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { WebAppDocument } from "@/modules/web-app/types";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import {
  WEB_APP_CONFIG,
  WEB_APP_STATUSES,
  OAUTH_GRANT_TYPES,
  OAUTH_RESPONSE_TYPES,
  TOKEN_ENDPOINT_AUTH_METHODS
} from "@/modules/web-app/constants";
// others
import { MODEL_NAMES } from "@/constants/models";

const { WEB_APP, WEB_APP_CATEGORY } = MODEL_NAMES;

const WebAppSchema = new Schema<WebAppDocument>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: WEB_APP_CATEGORY,
      required: [true, "Category ID is required"]
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      lowercase: true,
      maxlength: [
        WEB_APP_CONFIG.NAME_MAX_LENGTH,
        `Name must not exceed ${WEB_APP_CONFIG.NAME_MAX_LENGTH} characters`
      ],
      unique: true
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      maxlength: [
        WEB_APP_CONFIG.DISPLAY_NAME_MAX_LENGTH,
        `Display name must not exceed ${WEB_APP_CONFIG.DISPLAY_NAME_MAX_LENGTH} characters`
      ]
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [
        WEB_APP_CONFIG.DESCRIPTION_MAX_LENGTH,
        `Description must not exceed ${WEB_APP_CONFIG.DESCRIPTION_MAX_LENGTH} characters`
      ]
    },
    iconUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: [
        WEB_APP_CONFIG.URL_MAX_LENGTH,
        `Icon URL must not exceed ${WEB_APP_CONFIG.URL_MAX_LENGTH} characters`
      ]
    },
    homeUrl: {
      type: String,
      required: [true, "Home URL is required"],
      trim: true,
      maxlength: [
        WEB_APP_CONFIG.URL_MAX_LENGTH,
        `Home URL must not exceed ${WEB_APP_CONFIG.URL_MAX_LENGTH} characters`
      ]
    },
    clientId: {
      type: String,
      required: [true, "Client ID is required"],
      trim: true,
      maxlength: [
        WEB_APP_CONFIG.CLIENT_ID_MAX_LENGTH,
        `Client ID must not exceed ${WEB_APP_CONFIG.CLIENT_ID_MAX_LENGTH} characters`
      ],
      unique: true
    },
    clientSecretHash: {
      type: String,
      default: null,
      maxlength: [
        WEB_APP_CONFIG.CLIENT_SECRET_HASH_MAX_LENGTH,
        `Client secret hash must not exceed ${WEB_APP_CONFIG.CLIENT_SECRET_HASH_MAX_LENGTH} characters`
      ]
    },
    redirectUris: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (v: unknown[]) =>
            v.length <= WEB_APP_CONFIG.MAX_REDIRECT_URIS,
          message: `Redirect URIs must not exceed ${WEB_APP_CONFIG.MAX_REDIRECT_URIS} items`
        }
      ]
    },
    postLogoutRedirectUris: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (v: unknown[]) =>
            v.length <= WEB_APP_CONFIG.MAX_POST_LOGOUT_REDIRECT_URIS,
          message: `Post-logout redirect URIs must not exceed ${WEB_APP_CONFIG.MAX_POST_LOGOUT_REDIRECT_URIS} items`
        }
      ]
    },
    backchannelLogoutUri: {
      type: String,
      default: null,
      trim: true,
      maxlength: [
        WEB_APP_CONFIG.URL_MAX_LENGTH,
        `Back-channel logout URI must not exceed ${WEB_APP_CONFIG.URL_MAX_LENGTH} characters`
      ]
    },
    grantTypes: {
      type: [String],
      enum: Object.values(OAUTH_GRANT_TYPES),
      default: () => [...WEB_APP_CONFIG.DEFAULT_GRANT_TYPES],
      validate: [
        {
          validator: (v: unknown[]) =>
            v.length <= WEB_APP_CONFIG.MAX_GRANT_TYPES,
          message: `Grant types must not exceed ${WEB_APP_CONFIG.MAX_GRANT_TYPES} items`
        }
      ]
    },
    responseTypes: {
      type: [String],
      enum: Object.values(OAUTH_RESPONSE_TYPES),
      default: () => [...WEB_APP_CONFIG.DEFAULT_RESPONSE_TYPES],
      validate: [
        {
          validator: (v: unknown[]) =>
            v.length <= WEB_APP_CONFIG.MAX_RESPONSE_TYPES,
          message: `Response types must not exceed ${WEB_APP_CONFIG.MAX_RESPONSE_TYPES} items`
        }
      ]
    },
    scopes: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (v: unknown[]) => v.length <= WEB_APP_CONFIG.MAX_SCOPES,
          message: `Scopes must not exceed ${WEB_APP_CONFIG.MAX_SCOPES} items`
        }
      ]
    },
    tokenEndpointAuthMethod: {
      type: String,
      enum: Object.values(TOKEN_ENDPOINT_AUTH_METHODS),
      default: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
      required: [true, "Token endpoint auth method is required"]
    },
    requiredRoles: {
      type: [String],
      enum: Object.values(AUTHENTICATION_ROLES),
      default: () => [AUTHENTICATION_ROLES.USER],
      validate: [
        {
          validator: (v: unknown[]) =>
            v.length <= WEB_APP_CONFIG.MAX_REQUIRED_ROLES,
          message: `Required roles must not exceed ${WEB_APP_CONFIG.MAX_REQUIRED_ROLES} items`
        }
      ]
    },
    status: {
      type: String,
      enum: Object.values(WEB_APP_STATUSES),
      default: WEB_APP_STATUSES.ACTIVE,
      required: [true, "Status is required"]
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  {
    collection: "web_apps",
    timestamps: true
  }
);

WebAppSchema.index({ categoryId: 1, sortOrder: 1 });
WebAppSchema.index({ status: 1, sortOrder: 1 });

WebAppSchema.virtual("category", {
  ref: WEB_APP_CATEGORY,
  localField: "categoryId",
  foreignField: "_id",
  justOne: true
});

const WebAppModel: Model<WebAppDocument> = model<WebAppDocument>(
  WEB_APP,
  WebAppSchema
);

export default WebAppModel;
