"use client";

// libs
import { useMemo } from "react";
import { useTranslations } from "next-intl";
// types
import type { AdminLoginHistoryQueryParams } from "@/types/LoginHistory";
// components
import PageShell from "@/components/PageContainer/PageShell";
import PageHeader from "@/components/PageContainer/PageHeader";
import PageToolbar from "@/components/PageContainer/PageToolbar";
import PageContent from "@/components/PageContainer/PageContent";
import CustomPagination from "@/components/CustomPagination";
import CustomTable from "@/components/CustomTable";
import LoginHistoryTableSkeleton from "../../components/LoginHistoryTableSkeleton";
// hooks
import { useListQuery } from "@/hooks";
import useAdminLoginHistory from "../../hooks/useAdminLoginHistory";
// dataSources
import {
  buildAdminLoginHistoryColumns,
  buildLoginHistoryFilterDefs
} from "@/dataSources/LoginHistory";
// others
import { isLoginHistoryStatus, isLoginHistoryMethod } from "@/utils";
import CONSTANTS from "@/constants";

const { ADMIN_LOGIN_HISTORY } = CONSTANTS.ROUTES;

const AdminLoginHistoryTable = () => {
  const tAdmin = useTranslations("loginHistory.admin");
  const tTable = useTranslations("loginHistory.table");
  const tStatus = useTranslations("loginHistory.status");
  const tMethod = useTranslations("loginHistory.method");
  const tFilters = useTranslations("loginHistory.filters");
  const tLocation = useTranslations("loginHistory.location");

  const filterDefs = useMemo(
    () => buildLoginHistoryFilterDefs(tStatus, tMethod, tFilters),
    [tStatus, tMethod, tFilters]
  );

  const columns = useMemo(
    () => buildAdminLoginHistoryColumns(tTable, tMethod, tStatus, tLocation),
    [tTable, tMethod, tStatus, tLocation]
  );

  const query = useListQuery(filterDefs);

  const params: AdminLoginHistoryQueryParams = {
    page: query.page,
    limit: CONSTANTS.LIST.DEFAULT_PAGE_SIZE,
    ...(isLoginHistoryStatus(query.filters.status) && {
      status: query.filters.status
    }),
    ...(isLoginHistoryMethod(query.filters.method) && {
      method: query.filters.method
    }),
    ...(query.filters.fromDate && { fromDate: query.filters.fromDate }),
    ...(query.filters.toDate && { toDate: query.filters.toDate })
  };

  const { data, isLoading } = useAdminLoginHistory(params);
  const items = data?.items ?? [];
  const meta = data?.meta;

  const hasActiveFilters =
    query.activeFilterCount > 0 || Boolean(query.appliedSearch);

  return (
    <PageShell fullHeight>
      <PageHeader title={tAdmin("title")} description={tAdmin("description")} />
      <PageToolbar query={query} filterDefs={filterDefs} showSearch={false} />
      <PageContent
        fullHeight
        isLoading={isLoading}
        isEmpty={items.length === 0}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={query.clearFilters}
        skeleton={<LoginHistoryTableSkeleton />}
        emptyTitle={tTable("empty")}
      >
        <CustomTable
          fullHeight
          columns={columns}
          rows={items}
          getRowKey={(r) => r._id}
          caption={tTable("caption")}
          getRowHref={(r) => `${ADMIN_LOGIN_HISTORY}/${r._id}`}
          rowLabel={(r) =>
            tTable("viewDetailFor", { name: r.usernameAttempted })
          }
        />
      </PageContent>
      {(meta?.totalPages ?? 1) > 1 && (
        <CustomPagination
          page={meta?.page ?? query.page}
          totalPages={meta?.totalPages ?? 1}
          onPageChange={query.setPage}
        />
      )}
    </PageShell>
  );
};

export default AdminLoginHistoryTable;
