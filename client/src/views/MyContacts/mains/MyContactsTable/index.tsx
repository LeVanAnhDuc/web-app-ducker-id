"use client";

// libs
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
// types
import type { MyContactsQueryParams } from "@/types/MyContacts";
// components
import PageShell from "@/components/PageContainer/PageShell";
import PageHeader from "@/components/PageContainer/PageHeader";
import PageToolbar from "@/components/PageContainer/PageToolbar";
import PageContent from "@/components/PageContainer/PageContent";
import CustomTable from "@/components/CustomTable";
import CustomButton from "@/components/CustomButton";
import CustomPagination from "@/components/CustomPagination";
import SupportDialog from "@/components/SupportDialog";
import MyContactsTableSkeleton from "../../components/MyContactsTableSkeleton";
// hooks
import { useListQuery } from "@/hooks";
import useMyContacts, {
  MY_CONTACTS_QUERY_KEY
} from "../../hooks/useMyContacts";
// dataSources
import {
  buildMyContactsColumns,
  buildMyContactsFilterDefs
} from "@/dataSources/MyContacts";
// others
import CONSTANTS from "@/constants";
import { isContactStatus, generatePath } from "@/utils";

const { MY_CONTACT_DETAIL } = CONSTANTS.ROUTES;

const MyContactsTable = () => {
  const tPage = useTranslations("contactAdmin.myContacts");
  const tTable = useTranslations("contactAdmin.myContacts.table");
  const tStatus = useTranslations("contactAdmin.admin.list.status");
  const tPriority = useTranslations("contactAdmin.myContacts.priority");
  const tFilters = useTranslations("contactAdmin.myContacts.filters");

  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const filterDefs = useMemo(
    () => buildMyContactsFilterDefs(tStatus, { status: tFilters("status") }),
    [tStatus, tFilters]
  );

  const query = useListQuery(filterDefs);

  const columns = useMemo(
    () => buildMyContactsColumns(tTable, tStatus, tPriority),
    [tTable, tStatus, tPriority]
  );

  const params: MyContactsQueryParams = {
    page: query.page,
    limit: CONSTANTS.LIST.DEFAULT_PAGE_SIZE,
    ...(query.appliedSearch && { search: query.appliedSearch }),
    ...(isContactStatus(query.filters.status) && {
      status: query.filters.status
    })
  };

  const { data, isLoading } = useMyContacts(params);
  const items = data?.items ?? [];
  const meta = data?.meta;

  const hasActiveFilters =
    query.activeFilterCount > 0 || Boolean(query.appliedSearch);

  const handleSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: [MY_CONTACTS_QUERY_KEY] });
  };

  const submitNewButton = (
    <CustomButton
      onClick={() => setDialogOpen(true)}
      iconLeft={<Plus aria-hidden="true" />}
    >
      {tPage("submitNew")}
    </CustomButton>
  );

  return (
    <PageShell fullHeight>
      <PageHeader
        title={tPage("title")}
        description={tPage("description")}
        action={submitNewButton}
      />
      <PageToolbar
        query={query}
        filterDefs={filterDefs}
        searchPlaceholder={tFilters("searchPlaceholder")}
      />
      <PageContent
        fullHeight
        isLoading={isLoading}
        isEmpty={items.length === 0}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={query.clearFilters}
        skeleton={<MyContactsTableSkeleton />}
        emptyTitle={tTable("empty")}
        emptyAction={submitNewButton}
      >
        <CustomTable
          fullHeight
          columns={columns}
          rows={items}
          getRowKey={(r) => r._id}
          getRowHref={(r) => generatePath(MY_CONTACT_DETAIL, { id: r._id })}
          rowLabel={(r) => tTable("viewDetailFor", { id: r._id })}
          caption={tTable("caption")}
        />
      </PageContent>
      {(meta?.totalPages ?? 1) > 1 && (
        <CustomPagination
          page={meta?.page ?? query.page}
          totalPages={meta?.totalPages ?? 1}
          onPageChange={query.setPage}
        />
      )}
      <SupportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmitted={handleSubmitted}
      />
    </PageShell>
  );
};

export default MyContactsTable;
