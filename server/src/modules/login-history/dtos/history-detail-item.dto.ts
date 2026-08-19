// The detail DTO is structurally identical to the admin list item today, so it
// aliases AllHistoryItemDto to avoid duplicating the interface + mapper. Promote
// to a standalone type/mapper here if the detail shape ever diverges.
export type { AllHistoryItemDto as HistoryDetailItemDto } from "./all-history-item.dto";
export { toAllHistoryItemDto as toHistoryDetailItemDto } from "./all-history-item.dto";
