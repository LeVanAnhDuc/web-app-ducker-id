"use client";

// libs
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
// types
import type {
  AdminUser,
  AdminUsersQueryParams,
  AdminUserStatusFilter
} from "@/types/AdminUsers";
import type { AuthenticationRole } from "@/types/User";
// components
import PageShell from "@/components/PageContainer/PageShell";
import PageHeader from "@/components/PageContainer/PageHeader";
import PageToolbar from "@/components/PageContainer/PageToolbar";
import PageContent from "@/components/PageContainer/PageContent";
import CustomTable from "@/components/CustomTable";
import CustomPagination from "@/components/CustomPagination";
import UserRowActions from "../../components/UserRowActions";
import UsersTableSkeleton from "../../components/UsersTableSkeleton";
import AdminUsersResetPasswordDialog from "../AdminUsersResetPasswordDialog";
import AdminUsersLockDialog from "../AdminUsersLockDialog";
import AdminUsersForceLogoutDialog from "../AdminUsersForceLogoutDialog";
// ghosts
import TableLoadedAnnouncer from "@/ghosts/TableLoadedAnnouncer";
// hooks
import { useListQuery, useReturnFocus } from "@/hooks";
import useAdminUsersList from "../../hooks/useAdminUsersList";
// dataSources
import {
  buildAdminUsersColumns,
  buildAdminUsersFilterDefs
} from "@/dataSources/AdminUsers";
// others
import CONSTANTS from "@/constants";

const { AUTHENTICATION_ROLES } = CONSTANTS;

const isRole = (value: unknown): value is AuthenticationRole =>
  value === AUTHENTICATION_ROLES.USER || value === AUTHENTICATION_ROLES.ADMIN;

const { ACTIVE, LOCKED } = CONSTANTS.ADMIN_USER_STATUS;

const isStatus = (value: unknown): value is AdminUserStatusFilter =>
  value === ACTIVE || value === LOCKED;

const AdminUsersTable = () => {
  const t = useTranslations("adminUsers");
  const tTable = useTranslations("adminUsers.table");
  const tToolbar = useTranslations("adminUsers.toolbar");
  const tRole = useTranslations("adminUsers.role");
  const tStatus = useTranslations("adminUsers.status");
  const tAnnounce = useTranslations("adminUsers.announce");

  const filterDefs = useMemo(
    () => buildAdminUsersFilterDefs(tRole, tStatus, tToolbar),
    [tRole, tStatus, tToolbar]
  );
  const query = useListQuery(filterDefs);

  const columns = useMemo(() => buildAdminUsersColumns(tTable), [tTable]);

  const params: AdminUsersQueryParams = {
    page: query.page,
    ...(query.appliedSearch && { search: query.appliedSearch }),
    ...(isRole(query.filters.role) && { role: query.filters.role }),
    ...(isStatus(query.filters.status) && { status: query.filters.status })
  };

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [forceLogoutTarget, setForceLogoutTarget] = useState<AdminUser | null>(
    null
  );

  const returnFocus = useReturnFocus();
  const openFrom =
    (setTarget: (user: AdminUser) => void) =>
    (user: AdminUser, trigger: HTMLElement | null) => {
      returnFocus.remember(trigger);
      setTarget(user);
    };

  const { data, isLoading, isError } = useAdminUsersList(params);
  const items = data?.items ?? [];
  const meta = data?.meta;

  const hasActiveFilters =
    query.activeFilterCount > 0 || Boolean(query.appliedSearch);

  return (
    <PageShell fullHeight>
      <PageHeader title={t("title")} description={t("description")} />
      <PageToolbar
        query={query}
        filterDefs={filterDefs}
        searchPlaceholder={tToolbar("searchPlaceholder")}
      />
      <PageContent
        fullHeight
        isLoading={isLoading}
        isEmpty={!isError && items.length === 0}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={query.clearFilters}
        skeleton={<UsersTableSkeleton />}
        emptyTitle={tTable("empty")}
        emptyDescription={tTable("emptyDescription")}
      >
        {isError ? (
          <p
            className="text-destructive px-6 py-16 text-center text-sm"
            role="alert"
          >
            {tTable("error")}
          </p>
        ) : (
          <CustomTable
            fullHeight
            columns={columns}
            rows={items}
            getRowKey={(r) => r._id}
            rowActions={(user) => (
              <UserRowActions
                user={user}
                onResetPassword={openFrom(setResetTarget)}
                onLockToggle={openFrom(setLockTarget)}
                onForceLogout={openFrom(setForceLogoutTarget)}
              />
            )}
            actionsLabel={tTable("actions")}
          />
        )}
      </PageContent>
      <TableLoadedAnnouncer
        total={meta?.total}
        message={tAnnounce("loaded", { total: meta?.total ?? 0 })}
      />
      {(meta?.totalPages ?? 1) > 1 && (
        <CustomPagination
          page={meta?.page ?? query.page}
          totalPages={meta?.totalPages ?? 1}
          onPageChange={query.setPage}
        />
      )}
      <AdminUsersResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
        onCloseAutoFocus={returnFocus.onCloseAutoFocus}
      />
      <AdminUsersLockDialog
        target={lockTarget}
        onClose={() => setLockTarget(null)}
        onCloseAutoFocus={returnFocus.onCloseAutoFocus}
      />
      <AdminUsersForceLogoutDialog
        target={forceLogoutTarget}
        onClose={() => setForceLogoutTarget(null)}
        onCloseAutoFocus={returnFocus.onCloseAutoFocus}
      />
    </PageShell>
  );
};

export default AdminUsersTable;
