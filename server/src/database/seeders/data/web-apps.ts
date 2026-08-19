// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import {
  WEB_APP_STATUSES,
  TOKEN_ENDPOINT_AUTH_METHODS,
  OAUTH_GRANT_TYPES,
  OAUTH_RESPONSE_TYPES
} from "@/modules/web-app/constants";

const GRANT_TYPES = [
  OAUTH_GRANT_TYPES.AUTHORIZATION_CODE,
  OAUTH_GRANT_TYPES.REFRESH_TOKEN
];
const RESPONSE_TYPES = [OAUTH_RESPONSE_TYPES.CODE];
const SCOPES = ["openid", "profile", "email"];

export const WEB_APPS = [
  {
    categoryName: "content",
    name: "blog",
    displayName: "Blog",
    description: "Internal publishing platform for the constellation.",
    iconUrl: null,
    homeUrl: "https://blog.example.com",
    clientId: "client_blog_8f3a",
    clientSecret: "blog-dev-secret-8f3a",
    redirectUris: [
      "https://blog.example.com/auth/callback",
      "http://localhost:3001/auth/callback"
    ],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
    requiredRoles: [AUTHENTICATION_ROLES.USER],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 1
  },
  {
    categoryName: "tools",
    name: "analytics-dashboard",
    displayName: "Analytics Dashboard",
    description: "Org-wide metrics and dashboards.",
    iconUrl: null,
    homeUrl: "https://analytics.example.com",
    clientId: "client_analytics_2b7d",
    clientSecret: "analytics-dev-secret-2b7d",
    redirectUris: ["https://analytics.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
    requiredRoles: [AUTHENTICATION_ROLES.ADMIN],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 2
  },
  {
    categoryName: "identity",
    name: "idms-portal",
    displayName: "IDMS Portal",
    description: "Identity Management System portal — this app.",
    iconUrl: null,
    homeUrl: "https://idms.example.com",
    clientId: "client_idms_core",
    clientSecret: null,
    redirectUris: ["https://idms.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.NONE,
    requiredRoles: [AUTHENTICATION_ROLES.USER, AUTHENTICATION_ROLES.ADMIN],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 3
  },
  {
    categoryName: "productivity",
    name: "team-calendar",
    displayName: "Team Calendar",
    description: "Shared calendar for booking and reminders.",
    iconUrl: null,
    homeUrl: "https://calendar.example.com",
    clientId: "client_calendar_91ce",
    clientSecret: null,
    redirectUris: ["https://calendar.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.NONE,
    requiredRoles: [AUTHENTICATION_ROLES.USER],
    status: WEB_APP_STATUSES.INACTIVE,
    sortOrder: 4
  },
  {
    categoryName: "productivity",
    name: "notes",
    displayName: "Notes",
    description: "Personal and shared notes workspace.",
    iconUrl: null,
    homeUrl: "https://notes.example.com",
    clientId: "client_notes_44a9",
    clientSecret: null,
    redirectUris: ["https://notes.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.NONE,
    requiredRoles: [AUTHENTICATION_ROLES.USER],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 5
  },
  {
    categoryName: "tools",
    name: "ops-console",
    displayName: "Operations Console",
    description: "Internal ops tooling — restricted to admin role.",
    iconUrl: null,
    homeUrl: "https://ops.example.com",
    clientId: "client_ops_5e21",
    clientSecret: "ops-dev-secret-5e21",
    redirectUris: ["https://ops.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
    requiredRoles: [AUTHENTICATION_ROLES.ADMIN],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 6
  }
] as const;
