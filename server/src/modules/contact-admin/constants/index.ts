export const CONTACT_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
} as const;

export const CONTACT_STATUSES = {
  NEW: "new",
  PROCESSING: "processing",
  RESOLVED: "resolved"
} as const;

export const ADMIN_CONTACTS_SORT_BY = [
  "createdAt",
  "priority",
  "status"
] as const;
