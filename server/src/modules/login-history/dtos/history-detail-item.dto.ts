// The detail DTO is structurally identical to the admin list item today, so it
// aliases AllHistoryItemDto rather than duplicating the class. Promote it to a
// class of its own here if the detail shape ever diverges.
export { AllHistoryItemDto as HistoryDetailItemDto } from "./all-history-item.dto";
