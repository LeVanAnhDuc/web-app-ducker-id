export const SORT_ORDERS = {
  ASC: "asc",
  DESC: "desc"
} as const;

export type SortOrder = (typeof SORT_ORDERS)[keyof typeof SORT_ORDERS];

export const SORT_ORDER_VALUES: readonly SortOrder[] =
  Object.values(SORT_ORDERS);

export const resolveSortDirection = (order?: SortOrder): 1 | -1 =>
  order === SORT_ORDERS.ASC ? 1 : -1;

export const buildSort = (
  field: string,
  order?: SortOrder
): Record<string, 1 | -1> => ({ [field]: resolveSortDirection(order) });
