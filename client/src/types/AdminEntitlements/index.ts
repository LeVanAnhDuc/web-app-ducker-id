/** One matrix row as the server computes it. */
export interface UserAccess {
  userId: string;
  grantedAppIds: string[];
  /** Cells that differ from the role default; their default is the opposite of `granted`. */
  overriddenAppIds: string[];
}

export interface EntitlementMatrixResponse {
  users: UserAccess[];
}

export interface EntitlementMatrixFormValues {
  grants: Record<string, Record<string, boolean>>;
}

export interface EntitlementChange {
  userId: string;
  appId: string;
  granted: boolean;
}
