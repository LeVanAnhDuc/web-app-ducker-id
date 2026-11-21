// libs
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf
} from "class-validator";
// modules
import {
  TOKEN_ENDPOINT_AUTH_METHODS,
  WEB_APP_CONFIG,
  WEB_APP_STATUS_PUBLIC
} from "@/modules/web-app/constants";
import { isValidRedirectUri } from "@/modules/oauth/helpers";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// validators
import {
  ArrayUniqueItems,
  composeDecorators,
  EachItem,
  IsObjectId,
  Lowercase,
  Trim,
  TrimEach,
  UnlessMissing
} from "@/validators/decorators";

const STATUS_VALUES = Object.values(WEB_APP_STATUS_PUBLIC);
const ROLE_VALUES: readonly unknown[] = Object.values(AUTHENTICATION_ROLES);
const AUTH_METHOD_VALUES = Object.values(TOKEN_ENDPOINT_AUTH_METHODS);
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const URL_PATTERN = /^https?:\/\/.+/i;

const NAME = { MIN: 2, MAX: 64 };
const DISPLAY_NAME = { MIN: 2, MAX: 80 };
const DESCRIPTION_MAX = 500;
const URL_MAX = 2000;
const MAX_REDIRECT_URIS = 20;

// The rules of each app field without its presence rule: create adds
// `@IsDefined()` to the required ones, update skips every missing field.
// Rules are listed in reverse of the Joi chain, as class-validator reports the
// bottom-most failing one. Where Joi shipped English (a wrong type, a blank
// optional value) the field's nearest key stands in.

export const NameRules = (): PropertyDecorator =>
  composeDecorators(
    Matches(NAME_PATTERN, { message: "webApp:validation.name.invalid" }),
    MaxLength(NAME.MAX, { message: "webApp:validation.name.maxLength" }),
    MinLength(NAME.MIN, { message: "webApp:validation.name.minLength" }),
    IsNotEmpty({ message: "webApp:validation.name.required" }),
    IsString({ message: "webApp:validation.name.invalid" }),
    Lowercase(),
    Trim()
  );

export const DisplayNameRules = (): PropertyDecorator =>
  composeDecorators(
    MaxLength(DISPLAY_NAME.MAX, {
      message: "webApp:validation.displayName.maxLength"
    }),
    MinLength(DISPLAY_NAME.MIN, {
      message: "webApp:validation.displayName.minLength"
    }),
    IsNotEmpty({ message: "webApp:validation.displayName.required" }),
    IsString({ message: "webApp:validation.displayName.required" }),
    Trim()
  );

// Blank is allowed (the service stores it as null). `maxLength` is the only
// key this field has, so a wrong type reports it too.
export const DescriptionRules = (): PropertyDecorator =>
  composeDecorators(
    MaxLength(DESCRIPTION_MAX, {
      message: "webApp:validation.description.maxLength"
    }),
    IsString({ message: "webApp:validation.description.maxLength" }),
    UnlessMissing(),
    Trim()
  );

// Blank is allowed, so the URL rules only see a non-blank value.
export const IconUrlRules = (): PropertyDecorator =>
  composeDecorators(
    Matches(URL_PATTERN, { message: "webApp:validation.iconUrl.invalid" }),
    MaxLength(URL_MAX, { message: "webApp:validation.iconUrl.maxLength" }),
    IsString({ message: "webApp:validation.iconUrl.invalid" }),
    ValidateIf((_object, value) => value !== undefined && value !== ""),
    Trim()
  );

export const HomeUrlRules = (): PropertyDecorator =>
  composeDecorators(
    Matches(URL_PATTERN, { message: "webApp:validation.homeUrl.invalid" }),
    MaxLength(URL_MAX, { message: "webApp:validation.homeUrl.maxLength" }),
    IsNotEmpty({ message: "webApp:validation.homeUrl.required" }),
    IsString({ message: "webApp:validation.homeUrl.invalid" }),
    Trim()
  );

export const CategoryIdsRules = (): PropertyDecorator =>
  composeDecorators(
    ArrayUniqueItems({ message: "webApp:validation.categoryIds.duplicate" }),
    ArrayMaxSize(WEB_APP_CONFIG.MAX_CATEGORIES, {
      message: "webApp:validation.categoryIds.max"
    }),
    IsObjectId("webApp:validation.categoryIds.invalid", { each: true }),
    ArrayMinSize(1, { message: "webApp:validation.categoryIds.required" }),
    IsArray({ message: "webApp:validation.categoryIds.required" })
  );

// Joi checks `.valid()` first, so a blank or non-string status is unknown.
export const StatusRules = (): PropertyDecorator =>
  composeDecorators(
    IsIn(STATUS_VALUES, { message: "webApp:validation.status.invalid" }),
    IsString({ message: "webApp:validation.status.invalid" })
  );

export const RequiredRolesRules = (): PropertyDecorator =>
  composeDecorators(
    EachItem("isIn", (item) => ROLE_VALUES.includes(item), {
      message: "webApp:validation.requiredRoles.invalid"
    }),
    ArrayMinSize(1, { message: "webApp:validation.requiredRoles.required" }),
    IsArray({ message: "webApp:validation.requiredRoles.invalid" })
  );

/**
 * redirect_uri must be stricter than "looks like a URL": /oauth/authorize
 * matches against this list exactly, so it is only as safe as this check:
 * https only (http for localhost), no fragment, no wildcard. Each item is
 * trimmed first, and its length belongs to the same verdict so one bad item
 * is reported once, with one key.
 */
const isRegistrableRedirectUri = (item: unknown): boolean =>
  typeof item === "string" &&
  item.length <= URL_MAX &&
  isValidRedirectUri(item);

const RedirectUriItems = (): PropertyDecorator =>
  composeDecorators(
    EachItem("isRedirectUri", isRegistrableRedirectUri, {
      message: "webApp:validation.redirectUris.invalid"
    }),
    TrimEach()
  );

export const RedirectUrisRules = (): PropertyDecorator =>
  composeDecorators(
    ArrayMaxSize(MAX_REDIRECT_URIS, {
      message: "webApp:validation.redirectUris.maxItems"
    }),
    RedirectUriItems(),
    ArrayMinSize(1, { message: "webApp:validation.redirectUris.required" }),
    IsArray({ message: "webApp:validation.redirectUris.invalid" })
  );

// Optional and may be empty; it shares the redirect URI keys.
export const PostLogoutRedirectUrisRules = (): PropertyDecorator =>
  composeDecorators(
    ArrayMaxSize(MAX_REDIRECT_URIS, {
      message: "webApp:validation.redirectUris.maxItems"
    }),
    RedirectUriItems(),
    IsArray({ message: "webApp:validation.redirectUris.invalid" }),
    UnlessMissing()
  );

export const TokenEndpointAuthMethodRules = (): PropertyDecorator =>
  composeDecorators(
    IsIn(AUTH_METHOD_VALUES, {
      message: "webApp:validation.tokenEndpointAuthMethod.invalid"
    }),
    IsString({ message: "webApp:validation.tokenEndpointAuthMethod.invalid" }),
    UnlessMissing()
  );
