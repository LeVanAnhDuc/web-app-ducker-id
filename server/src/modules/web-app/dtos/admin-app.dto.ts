// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type { WebAppDocument, WebAppStatusPublic } from "../types";
// common
import {
  Expose,
  ExposeDate,
  ExposeFrom,
  ExposeId,
  ExposeOrNull,
  toDto
} from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// others
import {
  TOKEN_ENDPOINT_AUTH_METHODS,
  WEB_APP_STATUS_PUBLIC
} from "../constants";

/** Source: a web-app record. The admin view — OAuth client settings included, never the secret hash. */
export class AdminAppDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB _id of the app"
  })
  @ExposeId()
  _id!: string;

  @ApiProperty({
    example: "satellite-monitor",
    description: "Internal unique app name"
  })
  @Expose()
  name!: string;

  @ApiProperty({ example: "Satellite Monitor" })
  @Expose()
  displayName!: string;

  @ApiProperty({
    example: "Real-time constellation monitoring dashboard"
  })
  @ExposeOrNull()
  description!: string | null;

  @ApiProperty({
    example: "https://cdn.example.com/icons/satellite-monitor.png"
  })
  @ExposeOrNull()
  iconUrl!: string | null;

  @ApiProperty({ example: "https://monitor.example.com" })
  @Expose()
  homeUrl!: string;

  // Ids, not category objects: the admin form reads and writes ids, and the
  // admin screen already holds the category list to resolve names from.
  @ApiProperty({
    items: { type: "string", example: "507f1f77bcf86cd799439012" },
    description:
      "MongoDB _ids of the app's categories, in display order (first = primary)"
  })
  @ExposeFrom<WebAppDocument>((doc) => doc.categoryIds.map(String))
  categoryIds!: string[];

  @ApiProperty({
    type: "string",
    enum: Object.values(WEB_APP_STATUS_PUBLIC),
    example: WEB_APP_STATUS_PUBLIC.ACTIVE
  })
  @ExposeFrom<WebAppDocument>((doc) => WEB_APP_STATUS_PUBLIC[doc.status])
  status!: WebAppStatusPublic;

  @ApiProperty({
    items: { type: "string", enum: Object.values(AUTHENTICATION_ROLES) },
    example: [AUTHENTICATION_ROLES.USER],
    description: "Roles that may open the app"
  })
  @Expose()
  requiredRoles!: AuthenticationRole[];

  @ApiProperty({
    items: { type: "string" },
    example: ["https://monitor.example.com/callback"]
  })
  @Expose()
  redirectUris!: string[];

  @ApiProperty({
    items: { type: "string" },
    example: ["https://monitor.example.com/signed-out"]
  })
  @ExposeFrom<WebAppDocument>((doc) => doc.postLogoutRedirectUris ?? [])
  postLogoutRedirectUris!: string[];

  @ApiProperty({
    example: "client_abc123",
    description: "OAuth client identifier"
  })
  @Expose()
  clientId!: string;

  @ApiProperty({
    type: "string",
    enum: Object.values(TOKEN_ENDPOINT_AUTH_METHODS),
    example: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
    description: '"none" marks a public client (no secret is issued)'
  })
  @Expose()
  tokenEndpointAuthMethod!: string;

  @ApiProperty({ example: "2026-01-15T10:30:00.000Z" })
  @ExposeDate()
  createdAt!: string;

  @ApiProperty({ example: "2026-01-15T10:30:00.000Z" })
  @ExposeDate()
  updatedAt!: string;
}

/** Plain data: `toAdminAppCreatedDto` returns an object literal typed as this class. */
export class AdminAppCreatedDto extends AdminAppDto {
  /** null với public client — không có secret nào để trả về. */
  @ApiProperty({
    type: "string",
    nullable: true,
    example: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    description:
      "Plaintext OAuth client secret, returned once at creation; store it securely. null for a public client (tokenEndpointAuthMethod none)"
  })
  clientSecret!: string | null;
}

// The secret is shown once, at creation, and lives on no record — it is
// passed in, so a forgotten argument still fails to compile.
export const toAdminAppCreatedDto = (
  doc: WebAppDocument,
  clientSecret: string | null
): AdminAppCreatedDto => ({ ...toDto(AdminAppDto, doc), clientSecret });
