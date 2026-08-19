"use client";

// libs
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
// types
import type {
  AdminAppCreateResult,
  AdminAppsQueryParams,
  AppStatus,
  WebApp
} from "@/types/AdminApps";
// components
import PageShell from "@/components/PageContainer/PageShell";
import PageHeader from "@/components/PageContainer/PageHeader";
import PageToolbar from "@/components/PageContainer/PageToolbar";
import PageContent from "@/components/PageContainer/PageContent";
import CustomTable from "@/components/CustomTable";
import CustomButton from "@/components/CustomButton";
import AppRowActions from "../../components/AppRowActions";
import AdminAppsLoading from "../../components/AdminAppsLoading";
import AdminAppsFormSheet from "../AdminAppsFormSheet";
import AdminAppsHideDialog from "../AdminAppsHideDialog";
import AdminAppsSecretDialog from "../AdminAppsSecretDialog";
// hooks
import { useListQuery, useAnnounce, useClientSortedRows } from "@/hooks";
import useSetAdminAppStatus from "../../hooks/useSetAdminAppStatus";
// dataSources
import {
  APP_STATUSES,
  buildAdminAppsFilterDefs,
  buildAdminAppsColumns,
  ADMIN_APPS_SORT_ACCESSORS
} from "@/dataSources/AdminApps";
// requests
import { getAdminApps, getAdminAppCategories } from "@/requests/adminApps";
// others
import CONSTANTS from "@/constants";
import { resolveCategoryLabel } from "@/utils";

const isAppStatus = (value: unknown): value is AppStatus =>
  typeof value === "string" && APP_STATUSES.includes(value as AppStatus);

const AdminAppsTable = () => {
  const t = useTranslations("adminApps");
  const tTable = useTranslations("adminApps.table");
  const tToolbar = useTranslations("adminApps.toolbar");
  const tActions = useTranslations("adminApps.actions");
  const tStatus = useTranslations("adminApps.status");
  const tAnnounce = useTranslations("adminApps.announce");
  const tCategory = useTranslations("common.categories");
  const { announce } = useAnnounce();
  const setStatusMutation = useSetAdminAppStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<WebApp | null>(null);
  const [hideTarget, setHideTarget] = useState<WebApp | null>(null);
  const [createdApp, setCreatedApp] = useState<AdminAppCreateResult | null>(
    null
  );

  const { data: categories = [] } = useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_APP_CATEGORIES],
    queryFn: getAdminAppCategories
  });

  const statusOptions = useMemo(
    () =>
      APP_STATUSES.map((s) => ({
        value: s,
        label: tStatus(s)
      })),
    [tStatus]
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat._id,
        label: resolveCategoryLabel(tCategory, cat.slug, cat.name)
      })),
    [categories, tCategory]
  );

  const filterDefs = useMemo(
    () =>
      buildAdminAppsFilterDefs(statusOptions, categoryOptions, {
        status: tToolbar("status"),
        category: tToolbar("category")
      }),
    [statusOptions, categoryOptions, tToolbar]
  );

  const query = useListQuery(filterDefs);

  const params: AdminAppsQueryParams = {
    ...(query.appliedSearch && { search: query.appliedSearch }),
    ...(isAppStatus(query.filters.status) && { status: query.filters.status }),
    ...(query.filters.categoryId && { categoryId: query.filters.categoryId })
  };

  const { data, isLoading } = useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_APPS, params],
    queryFn: () => getAdminApps(params)
  });

  const categoryMap = useMemo(
    () =>
      new Map(
        categories.map((c) => [
          c._id,
          resolveCategoryLabel(tCategory, c.slug, c.name)
        ])
      ),
    [categories, tCategory]
  );

  const rawItems = data?.items ?? [];
  const items = useClientSortedRows(
    rawItems,
    query.sortBy,
    query.sortOrder,
    ADMIN_APPS_SORT_ACCESSORS
  );
  const hasActiveFilters =
    query.activeFilterCount > 0 || Boolean(query.appliedSearch);

  const columns = useMemo(
    () => buildAdminAppsColumns(tTable, categoryMap),
    [tTable, categoryMap]
  );

  const handleCreate = () => {
    setEditingApp(null);
    setFormOpen(true);
  };

  const handleEdit = (app: WebApp) => {
    setEditingApp(app);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingApp(null);
  };

  const handleHide = (app: WebApp) => setHideTarget(app);
  const handleCloseHide = () => setHideTarget(null);

  const handleUnhide = (app: WebApp) =>
    setStatusMutation.mutate(
      { id: app._id, status: CONSTANTS.APP_STATUS.ACTIVE },
      {
        onSuccess: () =>
          announce(tAnnounce("reactivated", { name: app.displayName }))
      }
    );

  const handleCloseSecret = () => setCreatedApp(null);

  return (
    <PageShell fullHeight>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <CustomButton
            onClick={handleCreate}
            iconLeft={<Plus aria-hidden="true" />}
          >
            {tActions("create")}
          </CustomButton>
        }
      />
      <PageToolbar
        query={query}
        filterDefs={filterDefs}
        searchPlaceholder={tToolbar("searchPlaceholder")}
      />
      <PageContent
        fullHeight
        isLoading={isLoading}
        isEmpty={items.length === 0}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={query.clearFilters}
        skeleton={<AdminAppsLoading />}
        emptyTitle={tTable("empty")}
        emptyDescription={tTable("emptyCta")}
      >
        <CustomTable
          fullHeight
          columns={columns}
          rows={items}
          getRowKey={(r) => r._id}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={query.setSort}
          rowActions={(app) => (
            <AppRowActions
              app={app}
              onEdit={handleEdit}
              onHide={handleHide}
              onUnhide={handleUnhide}
            />
          )}
          actionsLabel={tTable("actions")}
        />
      </PageContent>
      <AdminAppsFormSheet
        open={formOpen}
        editingApp={editingApp}
        onClose={handleCloseForm}
        onCreated={setCreatedApp}
      />
      <AdminAppsHideDialog target={hideTarget} onClose={handleCloseHide} />
      <AdminAppsSecretDialog app={createdApp} onClose={handleCloseSecret} />
    </PageShell>
  );
};

export default AdminAppsTable;
