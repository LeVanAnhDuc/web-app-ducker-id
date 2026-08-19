export interface Entitlement {
  _id: string;
  userId: string;
  webAppId: string;
  grantedBy: string;
  grantedAt: string;
  revokedAt: string | null;
}

export interface EntitlementMatrixFormValues {
  grants: Record<string, Record<string, boolean>>;
}

export interface EntitlementChange {
  userId: string;
  appId: string;
  granted: boolean;
}
